const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/Blog');
const jwt = require('jsonwebtoken');
const uploadDir = 'uploads';
if(process.env.NODE_ENV!=='production'){
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
}

// Multer configuration
const storage = process.env.NODE_ENV === 'production' 
? multer.memoryStorage():
 multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF images are allowed.'), false);
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log("verify");
    if (!token) {
      console.log("401 error");
      return res.status(401).json({ message: 'No token provided' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("decoded");
      
      req.adminId = decoded.id;
      next();
    } catch (err) {
      console.log("err");
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
// Create new blog post
router.post('/blogs', upload.single('image'), async (req, res) => {
    try {
      const { author, email, content, title } = req.body;
      
      // if (!req.file) {
      //   return res.status(400).json({ message: 'Please upload an image' });
      // }
      
      let imagePath=null;
      let imageFile=null;
      if (req.file) {
        if (process.env.NODE_ENV === 'production') {
          imagePath = null;
          imageFile = {
            data: req.file.buffer,
            contentType: req.file.mimetype
          };
        }
        else{
          const imageData = fs.readFileSync(req.file.path);
          imagePath= req.file.path,
          imageFile= {
          //data: imageData,
          // data: req.file.buffer,
          data:imageData,
          contentType: req.file.mimetype
        };
        }

      // Read the uploaded file
      // const imageData = fs.readFileSync(req.file.path);
      // imagePath= req.file.path,
      //   imageFile= {
      //     //data: imageData,
      //     // data: req.file.buffer,
      //     data:(process.env.NODE_ENV === 'production' 
      //     ? req.file.buffer:imageData),
      //     contentType: req.file.mimetype
      //   }
      }
      const newBlog = new Blog({
        author,
        email,
        content,
        title,
        imagePath,
        imageFile,
      });
    
  
      await newBlog.save();
  
      res.status(201).json({
        message: 'Blog post created successfully',
        blog: {
          id: newBlog._id,
          author: newBlog.author,
          title: newBlog.title,
          content: newBlog.content,
          imagePath: newBlog.imagePath,
          createdAt: newBlog.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({
        message: 'Error creating blog post',
        error: error.message
      });
    }
  });
  

// Get all approved blogs
router.get('/blogs', async (req, res) => {
  console.log("blog");
    try {
      const blogs = await Blog.find({ approved: true })
        .sort({ createdAt: -1 })
        .select('-email -imageFile'); // Exclude sensitive data
  
      res.status(200).json(blogs);
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching blogs',
        error: error.message
      });
    }
  });
// Get pending blogs (admin only)
router.get('/blogs/pending', verifyToken, async (req, res) => {
  console.log("pending");
  try {
    const blogs = await Blog.find({ approved: false })
      .sort({ createdAt: -1 });

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching pending blogs',
      error: error.message
    });
  }
});
  // Get single blog by ID
router.get('/blogs/:id', async (req, res) => {
  console.log("blog_id");
    try {
      const blog = await Blog.findById(req.params.id)
        .select('-imageFile');
      
      if (!blog) {
        return res.status(404).json({ message: 'Blog not found' });
      }
  
      res.status(200).json(blog);
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching blog',
        error: error.message
      });
    }
  });

  // Get blog image
router.get('/blogs/:id/image', async (req, res) => {
  console.log("img");
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog || !blog.imageFile) {
        return res.status(404).json({ message: 'Image not found' });
      }
  
      res.set('Content-Type', blog.imageFile.contentType);
      res.send(blog.imageFile.data);
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching image',
        error: error.message
      });
    }
  });
  
  



// Approve blog (admin only)
router.patch('/blogs/:id/approve',verifyToken, async (req, res) => {
  console.log("approve");
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.status(200).json({
      message: 'Blog approved successfully',
      blog
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error approving blog',
      error: error.message
    });
  }
});

// Delete blog (admin only)
router.delete('/blogs/:id', verifyToken, async (req, res) => {
  console.log("del");
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.status(200).json({
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting blog',
      error: error.message
    });
  }
});

module.exports = router;
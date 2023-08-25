// routes.js
const express = require('express');
const { User , File} = require('./models');
const mongoose = require('mongoose');
const { VM } = require('vm2');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const multer = require('multer');
const bodyParser = require('body-parser');
const { exec } = require('child_process'); 


// Configure AWS SDK
AWS.config.update({
  accessKeyId: 'AKIAUJMUCBFH4T5Q6UHH',
  secretAccessKey: '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',
  region: 'ap-south-1',
});
const s3 = new AWS.S3();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,// Adjust the file size limit as needed (10MB in this example)
});
const requireAuth = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    const decodedToken = jwt.verify(token, 'your-secret-key');
    req.user = decodedToken; // Store the decoded user information in the request object
    const userId = decodedToken.userId;
    req.userId = userId; 
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

router.post('/register', async (req, res) => {
  try {
    const { email, password,name} = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user document
    const newUser = new User({ email, password: hashedPassword ,name});
    await newUser.save();


    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await User.findOne({email});
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token and send it to the client
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token,userId:user._id });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/upload', upload.single('file'), requireAuth, async (req, res) => {
  const file = req.file;
  const type = req.body.fileType;
  const userId = req.userId; // Get the userId from the request (assuming it's set by your authentication middleware)

  const params = {
    Bucket: 'storage-image-node',
    Key: `${req.file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  s3.upload(params, async (error, data) => {
    if (error) {
      console.error('Error uploading to S3:', error);
      return res.status(500).json({ error: 'Error uploading to S3' });
    }

    console.log('File uploaded successfully:', data.Location);

    try {
      const newFile = new File({
        fileName: req.file.originalname,
        fileUrl: data.Location,
        fileType: type,
      });

      // Save the new file record
      await newFile.save();

      // Find the user by userId
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Add the URL to the user's uploadedFiles array
      user.uploadedFiles.push(newFile._id);
      // Save the new user record
      await user.save();

      res.json({ message: 'File uploaded and URL saved successfully' });
    } catch (error) {
      console.error('Error saving file info:', error);
      res.status(500).json({ error: 'Error saving file info' });
    }
  });
});

router.get('/files/:userId',requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('uploadedFiles');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.uploadedFiles);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Error fetching files' });
  }
});
router.put('/update-file/:id',async (req, res) => {
  try {
    const fileId = req.params.id;
    const newFileContent = req.body.newContent; // This is the new content you want to update with
    let fileName;
    // Find the file in MongoDB
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    try{
      const response = await fetch(`http://localhost:5500/api/get-file/${fileId}`);
        const data = await response.json();
        const file = data.file;

        // Save fileUrl
        fileName = file.fileName;
        const fileUrl = file.fileUrl;
    } catch(error){
      console.log(error);
    }

    // Update the content in MongoDB
    file.body = newFileContent;
    await file.save();
    const params1 = {
      Bucket: 'storage-image-node',
      Key: fileName,
      Body: newFileContent,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };
  
    s3.upload(params1, async (error, data) => {
      if (error) {
        console.error('Error uploading to S3:', error);
        return res.status(500).json({ error: 'Error uploading to S3' });
      }
  
      console.log('File uploaded successfully:', data.Location);

    });

    

    res.json({ message: 'File content updated successfully', updatedFile: file });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/get-file/:id',async (req, res) => {
  try {
    const fileId = req.params.id;

    // Find the file in MongoDB
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file });
  } catch (error) {
    console.error('Error fetching file details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.use(bodyParser.json());

// Route to run code and return output







module.exports = router;

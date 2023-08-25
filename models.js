// models.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type:String,
    required:true
  },
  uploadedFiles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }
  ]
});

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String, 
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
});

const User = mongoose.model('User',userSchema);
const File = mongoose.model('File',fileSchema);

module.exports = { User, File};

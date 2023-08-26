const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import the cors module
const Router = require('./routes');

const app = express();

app.use(express.json());

app.use(cors({
  origin: ['http://127.0.0.1:5501','https://codecollabserver.onrender.com','https://nishantsirohi23.github.io'],
}));

mongoose.connect(
  "mongodb+srv://nishant:mernstack@cluster0.0uk4gdp.mongodb.net/code_collab?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log(`Database connected`);
});

app.use('/api', Router);

const port = 5500;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

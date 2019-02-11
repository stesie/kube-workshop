const express = require('express');
const os = require('os');

const app = express();

const extraMsg = process.env.EXTRA_MESSAGE || 'EXTRA_MESSAGE variable not set';
let counter = 0;

app.get('/', function (req, res) {
  res.send(`Request counter: ${++counter}.  This request was served to you by ${os.hostname()} :-)\n${extraMsg}`);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


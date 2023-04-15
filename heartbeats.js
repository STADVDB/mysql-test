const http = require('http');
const heartbeats = require('heartbeats');

var heart = heartbeats.createHeart(5000); // heart that check server every 5 seconds
const server2 = 'http://ccscloud3.dlsu.edu.ph:38002';

const mysql = require('mysql2');

const con2Config = {
  host: 'ccscloud3.dlsu.edu.ph',
  port: '39001',
  user: 'dev',
  password: '12341234',
  database: 'imdb'
}
const pool2 = mysql.createPool(con2Config);

// db test
heart.createEvent(1, function (count, last) {

  pool2.getConnection(function(error, connection) {
    if(error) {
      console.log('node is not running');
    }
    console.log('node is running'); 
    connection.release();
  });
});

heart.createEvent(1, function (count, last) {
  http
    .get(server2, function (res) {
      // If you get here, you have a response.
      console.log('website running');
    })
    .on('error', function (e) {
      // Here, an error occurred.  Check `e` for the error.
      console.log('website not running');
    });
});

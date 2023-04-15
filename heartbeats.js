const http = require('http');
const heartbeats = require('heartbeats');

var heart = heartbeats.createHeart(5000); // heart that check server every 5 seconds
const server2 = 'http://ccscloud3.dlsu.edu.ph:38002';

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

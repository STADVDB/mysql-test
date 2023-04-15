var http = require('http');
const heartbeats = require('heartbeats');

var heart = heartbeats.createHeart(5000); // heart that beats every 5 seconds

// heart.createEvent(1, function (count, last) {
//   console.log('...Every Single Beat forever');
// });

heart.createEvent(1, function (count, last) {
  console.log('heart beat');
  http
    .get('	http://ccscloud3.dlsu.edu.ph:38002', function (res) {
      // If you get here, you have a response.
      // If you want, you can check the status code here to verify that it's `200` or some other `2xx`.
      console.log('website running');
    })
    .on('error', function (e) {
      // Here, an error occurred.  Check `e` for the error.
      console.log('website not running');
    });
});

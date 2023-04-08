const express = require('express');
const exphbs = require('express-handlebars');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })) // might change later

app.set('view engine', 'hbs');
app.engine("hbs", exphbs.engine({
    extname: "hbs"
    // helpers: require(__dirname + '/public/hbs-helpers/helpers.js')
}));

app.use(express.static('public'));

const mysql = require('mysql2');
var con0 = mysql.createConnection({
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39000',
    user: 'dev',
    password: '12341234'
});

var con1 = mysql.createConnection({
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39001',
    user: 'dev',
    password: '12341234'
});

var con2 = mysql.createConnection({
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39002',
    user: 'dev',
    password: '12341234'
});

con0.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + con0.threadId);
});

con1.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + con1.threadId);
});

con2.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + con2.threadId);
});

app.get('/', function (req, res) {
    //   res.sendFile(path.join(__dirname, '/index.html'));
    var query = "SELECT * FROM imdb.movies LIMIT 30;"
    con0.query(query, function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        // connected!

        res.render('index', { tuple: results });
    });
});

app.get('/1', function (req, res) {
    //   res.sendFile(path.join(__dirname, '/index.html'));
    var query = "SELECT * FROM imdb.movies LIMIT 30;"
    con1.query(query, function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        // connected!

        res.render('index', { tuple: results });
    });
});

app.get('/2', function (req, res) {
    //   res.sendFile(path.join(__dirname, '/index.html'));
    var query = "SELECT * FROM imdb.movies LIMIT 30;"
    con2.query(query, function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        // connected!

        res.render('index', { tuple: results });
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
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

const mysql = require('mysql2/promise');

const con0Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39000',
    user: 'dev',
    password: '12341234'
}

const con1Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39001',
    user: 'dev',
    password: '12341234'
}

const con2Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39002',
    user: 'dev',
    password: '12341234'
}

app.get('/', async function (req, res) {
    //   res.sendFile(path.join(__dirname, '/index.html'));
    var query = "SELECT * FROM imdb.movies LIMIT 30;"

    var con = await mysql.createConnection(con0Config);

    const [results, fields] = await con.query(query);
    console.log(results);
    await res.render('index', {tuple: results});
});

app.get('/transaction', async function (req, res) {

    var query =
        "UPDATE imdb.movies " +
        "SET `rank` = 5 " +
        "WHERE id = 0;";

    var con = await mysql.createConnection(con0Config);

    await con.execute("SET AUTOCOMMIT = 0;");

    await con.beginTransaction();

    try {
        await con.execute(query);
        await res.redirect("/");
    } catch (err) {
        console.error(`Error occurred while creating order: ${err.message}`, err);
        con.rollback();
        console.info('Rollback successful');
        return 'error creating order';
    }


});

app.get('/rollback', async function (req, res) {
    var con = await mysql.createConnection(con0Config);
    await con.rollback();
    res.redirect("/");
});

app.get('/1', function (req, res) {
    //   res.sendFile(path.join(__dirname, '/index.html'));

    var con = mysql.createConnection(con1Config);

    var query = "SELECT * FROM imdb.movies LIMIT 30;"
    con.query(query, function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        // connected!

        res.render('index', { tuple: results });
    });
});

app.get('/2', function (req, res) {
    //   res.sendFile(path.join(__dirname, '/index.html'));
    var con = mysql.createConnection(con2Config);

    var query = "SELECT * FROM imdb.movies LIMIT 30;"
    con.query(query, function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        // connected!

        res.render('index', { tuple: results });
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
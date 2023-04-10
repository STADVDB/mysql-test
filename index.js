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

const con0Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39000',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const con1Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39001',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const con2Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39002',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const pool = mysql.createPool(con0Config);

getList = () => {
    var query = "SELECT * FROM movies LIMIT 30;";

    return new Promise((resolve, reject) => {
        pool.query(query, (error, results) => {
            if(error) return reject(error);

            return resolve(results);
        })
    })
}

app.get('/', async function (req, res) {
    try {
        const results = await getList();
        res.render('index', { tuple: results});
    }
    catch(error) {
        console.log(error);
    }
});

updateRank = () => {
    var query = "UPDATE movies SET `rank` = 23 WHERE id = 0;";

    return new Promise((resolve, reject) => {
        pool.getConnection(function(error, connection) {
            connection.beginTransaction(function(err) {
                if(err) return reject(err);

                connection.execute("SET AUTOCOMMIT=0");
                connection.execute(query, (error) => {
                    if (error) {
                        connection.rollback();
                        return reject(error);
                    }
                    return resolve();
                });
            });
            pool.releaseConnection(connection);
            console.log("connection released");
        });
    })
}

app.get('/transaction', async function (req, res) {
    try {
        await updateRank();
        res.redirect('/')
    }
    catch(error) {
        console.log(error)
    }
});

app.get('/rollback', function (req, res) {
    pool.getConnection(function(error, connection) {
        connection.rollback();
        pool.releaseConnection(connection);
    })
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
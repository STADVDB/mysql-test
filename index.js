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

const con1Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39000',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const con2Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39001',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const con3Config = {
    host: 'ccscloud3.dlsu.edu.ph',
    port: '39002',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const pool1 = mysql.createPool(con1Config);
const pool2 = mysql.createPool(con2Config);
const pool3 = mysql.createPool(con3Config);

getPool = (input) => {
    var pool;

    if (input == 3) {
        pool = pool3;
    }
    else if (input == 2) {
        pool = pool2;
    }
    else {
        pool = pool1;
    }

    try {
        pool.getConnection(function (error, connection) {
            if (error) throw error;
            connection.release();
        })
        console.log("Connection successful to node " + input);
        return pool;
    } catch (error) {
        console.log(error);
        console.log("Redirecting to node 1");
        return pool1;
    }
}

insertMovie = (pool, isolationLevel, name, year, rank) => {
    var query = "INSERT INTO movies (name, year, `rank`) " +
        "VALUES (?, ?, ?);";

    return new Promise((resolve, reject) => {

        pool.getConnection(function (error, connection) {
            if (error) return reject(error);

            connection.execute("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
            connection.execute("SET AUTOCOMMIT=0");
            connection.beginTransaction(function (error) {
                if (error) {
                    connection.rollback();
                    return reject(error);
                }
                connection.execute(query, [name, year, rank], function (error, results) {
                    if (error) {
                        connection.rollback();
                        return reject(error);
                    }
                    connection.execute("COMMIT;");
                    return resolve();
                });
            });
            console.log("Connection released");
            pool.releaseConnection(connection);
        });
    });
}

app.get('/insert', async function (req, res) {
    var isolationLevel = req.query.isolationLevel;
    var pool = await getPool(req.query.pool);
    var name = req.query.name;
    var year = req.query.year;
    var rank = req.query.rank;

    if (rank == "")
        rank = null;

    try {
        await insertMovie(pool1, isolationLevel, name, year, rank);
        console.log("Inserted new movie at master node");
        await insertMovie(pool, isolationLevel, name, year, rank);
        res.redirect("/")
    } catch (error) {
        console.log(error);
    }
})

// TODO: add locking stuff and recovery stuff
updateMovie = (pool, isolationLevel, id, name, year, rank) => {
    var query = "UPDATE movies SET name = ?, year = ?, `rank` = ? WHERE " +
        "id = ?;";

    return new Promise((resolve, reject) => {

        pool.getConnection(function (error, connection) {
            if (error) return reject(error);

            connection.execute("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
            connection.execute("SET AUTOCOMMIT=0");
            connection.beginTransaction(function (error) {
                if (error) {
                    connection.rollback();
                    return reject(error);
                }
                connection.execute("SELECT * FROM movies WHERE id = ? FOR UPDATE;", [id]);
                connection.execute(query, [name, year, rank, id], function (error, results) {
                    if (error) {
                        connection.rollback();
                        return reject(error);
                    }
                    connection.execute("COMMIT;");
                    return resolve();
                });
            });
            console.log("Connection released");
            pool.releaseConnection(connection);
        });
    });
}

app.get('/update', async function (req, res) {
    var id = req.query.id;
    var isolationLevel = req.query.isolationLevel;
    var pool = await getPool(req.query.pool);
    var name = req.query.name;
    var year = req.query.year;
    var rank = req.query.rank;

    if (rank == "")
        rank = null;

    try {
        await updateMovie(pool1, isolationLevel, id, name, year, rank);
        console.log("Updated master node");
        await updateMovie(pool, isolationLevel, id, name, year, rank);
        res.redirect("/")
    } catch (error) {
        console.log(error);
    }
});

// TODO: add locking stuff and recovery stuff
searchById = (pool, isolationLevel, id) => {
    var query = "SELECT * FROM movies WHERE id = ? FOR SHARE";

    return new Promise((resolve, reject) => {
        pool.getConnection(function (error, connection) {
            if (error) return reject(error);
            connection.query("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
            connection.beginTransaction(function (error) {
                if (error) {
                    connection.rollback();
                    return reject(error);
                }
                connection.execute("SELECT * FROM movies WHERE id = ? LOCK IN SHARE MODE;", [id]);
                connection.execute(query, [id], function (error, results) {
                    if (error) return reject(error);

                    console.log(results);
                    connection.rollback();
                    return resolve(results);
                });
            });
            pool.releaseConnection(connection);
        });
    })
}

app.get('/search', async function (req, res) {

    var id = req.query.id;
    var isolationLevel = req.query.isolationLevel;
    var pool = await getPool(req.query.pool);

    console.log(id);

    try {
        const result = await searchById(pool, isolationLevel, id);
        res.render('search', { tuple: result });
    } catch (error) {
        console.log(error);
    }
});

getList = () => {
    var query = "SELECT * FROM movies LIMIT 30;";

    return new Promise((resolve, reject) => {
        pool1.query(query, (error, results) => {
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
        pool1.getConnection(function(error, connection) {
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
            pool1.releaseConnection(connection);
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
    pool1.getConnection(function(error, connection) {
        connection.rollback();
        pool1.releaseConnection(connection);
    })
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
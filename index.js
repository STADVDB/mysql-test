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

const fs = require('fs');

// log paths 
const directoryPath = 'logs/';
const historyPath = 'logs/history.json';
const errorPath = 'logs/errors.json';

// Create log files if they do not exist yet 
if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
}

if (!fs.existsSync(historyPath)) {
    console.log('Creating history log');
    fs.writeFileSync('logs/history.json', '[]');
}

if (!fs.existsSync(errorPath)) {
    console.log('Creating error log');
    fs.writeFileSync('logs/errors.json', '[]');
}

const UNRESOLVED = 'UNRESOLVED';
const RESOLVED = 'RESOLVED';
const COMMITTED = 'COMMITTED';
const ABORTED = 'ABORTED';

date = new Date();

function Error(node, status) {
    this.date = date;
    this.node = node;
    this.status = status;
}

function Update(node, id, name, year, rank, status) {
    this.node = node;
    this.date = date;
    this.id = id;
    this.name = name;
    this.year = year;
    this.rank = rank;
    this.status = status;
}

function Insert(node, name, year, rank, status) {
    this.node = node;
    this.date = date;
    this.name = name;
    this.year = year;
    this.rank = rank;
    this.status = status;
}

async function log(path, log) {
    fs.readFile(path, function (error, data) {
        if (error) console.log(error);

        var jsonContent = JSON.parse(data);
        jsonContent.push(log);
        var jsonString = JSON.stringify(jsonContent);
        fs.writeFile(path, jsonString, function (error) {
            if (error) console.log(error);
        });
        console.log('The new item was appended to the JSON array!');
    });
}

async function setResolved(index) {
    fs.readFile(errorPath, function (error, data) {
        if (error) console.log(error);

        var jsonContent = JSON.parse(data);
        jsonContent[index].status = "RESOLVED";
        var jsonString = JSON.stringify(jsonContent);
        fs.writeFile(errorPath, jsonString, function (error) {
            if (error) console.log(error);
        });
    })
}

// async function checkConnection(pool, input) {
//     await pool.getConnection(async function (error, connection) {
//         if (error) {
//             console.log(error);
//             return false;
//         }
//         else {
//             console.log("Connection successful to node " + input);
//             connection.release();
//             return true;
//         }
//     });
// }

async function getPool(input) {
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

    return pool; 

}

getPoolbyYear = (year) => {
    if (year >= 1980) {
        return pool3;
    }
    return pool2;
}

getPoolNumber = (pool) => {
    if (pool == pool1) {
        return 1;
    }
    else if (pool == pool2) {
        return 2;
    }
    else {
        return 3;
    }
}

insertMovie = (pool, isolationLevel, name, year, rank) => {
    var query = "INSERT INTO movies (name, year, `rank`) " +
        "VALUES (?, ?, ?);";

    const NODE = getPoolNumber(pool);
    var newLog = new Insert(NODE, name, year, rank, ABORTED);

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
                        log(historyPath, newLog);
                        log(errorPath, new Error(NODE, UNRESOLVED));
                        return reject(error);
                    }
                    newLog.status = COMMITTED;
                    log(historyPath, newLog);
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
    var name = req.query.name;
    var year = req.query.year;
    var pool = await getPoolbyYear(year);
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

// TODO: add recovery stuff
updateMovie = (pool, isolationLevel, id, name, year, rank) => {
    var query = "UPDATE movies SET name = ?, year = ?, `rank` = ? WHERE " +
        "id = ?;";

    const NODE = getPoolNumber(pool);
    var newLog = new Update(NODE, id, name, year, rank, ABORTED);

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
                        log(historyPath, newLog);
                        log(errorPath, new Error(NODE, UNRESOLVED));
                        return reject(error);
                    }
                    newLog.status = COMMITTED;
                    log(historyPath, newLog);
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

    try {
        const result = await searchById(pool, isolationLevel, id);
        res.render('index', { tuple: result });
    } catch (error) {
        console.log(error);
        console.log("Could not connect to Node " + req.query.pool + ", trying connection with Node 1"); 
        const result = await searchById(pool1, isolationLevel, id);
        res.render('index', { tuple: result });
    }
});

getList = () => {
    var query = "SELECT * FROM movies LIMIT 30;";
    // var query = "SELECT * FROM movies ORDER BY id DESC LIMIT 30;";

    return new Promise((resolve, reject) => {
        pool1.query(query, (error, results) => {
            if (error) return reject(error);

            return resolve(results);
        })
    })
}

app.get('/', async function (req, res) {
    // try {
    //     const results = await getList();
    //     res.render('index', { tuple: results });
    // }
    // catch (error) {
    //     console.log(error);
    // }

    res.render('index');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
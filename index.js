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
const heartbeats = require('heartbeats');

const con1Config = {
    host: '172.16.3.100',
    port: '3306',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const con2Config = {
    host: '172.16.3.101',
    port: '3306',
    user: 'dev',
    password: '12341234',
    database: 'imdb'
}

const con3Config = {
    host: '172.16.3.102',
    port: '3306',
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
const UPDATE = 'UPDATE';
const INSERT = 'INSERT';
const REPLICATION = 'REPLICATION';
const TRANSACTION = 'TRANSACTION';

date = new Date();

function Error(node, type, status) {
    this.date = date;
    this.node = node;
    this.type = type; 
    this.status = status;
}

function Update(node, id, name, year, rank, status) {
    this.node = node;
    this.type = UPDATE
    this.date = date;
    this.id = id;
    this.name = name;
    this.year = year;
    this.rank = rank;
    this.status = status;
}

function Insert(node, id, name, year, rank, status) {
    this.node = node;
    this.type = INSERT; 
    this.date = date;
    this.name = name;
    this.year = year;
    this.rank = rank;
    this.status = status;
}

async function log(path, log) {
    fs.readFile(path, async function (error, data) {
        if (error) console.log(error);

        try {
            var jsonContent = await JSON.parse(data);
            await jsonContent.push(log);
            var jsonString = JSON.stringify(jsonContent);
            fs.writeFile(path, jsonString, function (error) {
                if (error) {
                    console.log(error);
                    console.log("error writing " + jsonContent);
                }
            });
            console.log('The new item was appended to ' + path);
        } catch (error) {
            console.log(error);
        }
    });
}

async function setResolved(index) {
    fs.readFile(errorPath, function (error, data) {
        if (error) console.log(error);

        var jsonContent = JSON.parse(data);
        jsonContent[index].status = RESOLVED;
        var jsonString = JSON.stringify(jsonContent);
        fs.writeFile(errorPath, jsonString, function (error) {
            if (error) console.log(error);
        });
    })
}

fs.watchFile(errorPath, { persistent: true, interval: 500 }, (curr, prev) => {
    fs.readFile(errorPath, (err, data) => {
        if (err) console.log(err);

        const parsed = JSON.parse(data);
        const index = parsed.length - 1; 
        const recentLog = parsed[index];

        if (recentLog.status === UNRESOLVED) {
            console.log("Unresolved error found, starting pulse");
            createPulse(getPool(recentLog.node), recentLog.node, index, recentLog);
        }
    });
});

var heart = heartbeats.createHeart(5000); // heart that check server every 5 seconds

createPulse = (pool, nodeNumber, index, errorLog) => {
    const event = heart.createEvent(1, function (count, last) {

        pool.getConnection(function (error, connection) {
            if (error) {
                console.log('Reconnecting to node ' + nodeNumber);
            }
            else {
                console.log('Reconnected to node ' + nodeNumber);
                recover(pool, nodeNumber, errorLog)
                connection.release();
                setResolved(index);
                event.kill();
            }
        });
    });
}

function isTargetNode(nodeNumber, errorType, currentNode) {
    if(errorType == TRANSACTION) {
        if(nodeNumber == currentNode) {
            return true; 
        } 
        return false; 
    }
    else {
        if(nodeNumber == 1 && (currentNode == 2 || currentNode == 3)) {
            return true; 
        }
        else if((nodeNumber == 2 || nodeNumber == 3) && currentNode == 1) {
            return true; 
        }
        return false; 
    }
}

recover = (pool, nodeNumber, errorLog) => {
    fs.readFile(historyPath, async (error, data) => {
        if(error) console.log(error); 

        var parsed = JSON.parse(data);
        var errorType = errorLog.type; 
        // var checkpoint = errorLog.date; 

        for(i = 0; i < parsed.length; i++) {
            current = parsed[i]; 
            if (isTargetNode(nodeNumber, errorType, current.node)) {
                if (nodeNumber == 1 && current.status == COMMITTED) {
                    if (current.type == UPDATE) {
                        await updateMovie(pool, 'SERIALIZABLE', current.id, current.name, current.year, current.rank);
                    }
                    else if (current.type == INSERT) {
                        await recoveryInsert(pool, current.name, current.year, current.rank);
                    }
                }
                else if (nodeNumber == 2) {
                    if (current.year < 1980 && current.status == COMMITTED) {
                        if (current.type == UPDATE) {
                            await updateMovie(pool, 'SERIALIZABLE', current.id, current.name, current.year, current.rank);
                        }
                        else if (current.type == INSERT) {
                            await recoveryInsert(pool, current.name, current.year, current.rank);
                        }
                    }
                }
                else if (nodeNumber == 3) {
                    if (current.year >= 1980 && current.status == COMMITTED) {
                        if (current.type == UPDATE) {
                            await updateMovie(pool, 'SERIALIZABLE', current.id, current.name, current.year, current.rank);
                        }
                        else if (current.type == INSERT) {
                            await recoveryInsert(pool, current.name, current.year, current.rank);
                        }
                    }
                }
            }
            
        }
    })
}

recoveryInsert = (pool, name, year, rank) => {
    result = searchByName(pool, name)
    result.then((data) => {
        if(data.length == 0) {
            insertMovie(pool, 'SERIALIZABLE', name, year, rank); 
        }
        else {
            fromDB = data[0].name + data[0].year + data[0].rank;
            fromLogs = name + year + rank; 
            if(fromDB != fromLogs) {
                insertMovie(pool, 'SERIALIZABLE', name, year, rank); 
            }
            else {
                console.log("Insert not needed"); // for test only, delete this clause after
            }
        }
    })
}

// insertMovie = (pool, isolationLevel, name, year, rank) => {

searchByName = (pool, name) => {
    query = "SELECT * FROM movies WHERE name LIKE ? LIMIT 1;"; 

    return new Promise((resolve, reject) => {
        pool.getConnection(function (error, connection) {
            if (error) return reject(error);
            connection.beginTransaction(function (error) {
                if (error) {
                    connection.rollback();
                    return reject(error);
                }
                connection.execute(query, [name], function (error, results) {
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

function getPool(input) {
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
                        log(errorPath, new Error(NODE, TRANSACTION, UNRESOLVED));
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
        await insertMovie(pool, isolationLevel, name, year, rank);
        console.log("Inserted new movie at node " + getPoolNumber(pool));
    }
    catch (error) {
        await log(errorPath, new Error(await getPoolNumber(pool), REPLICATION, UNRESOLVED));
        console.log("Could not add new movie at node " + getPoolNumber(pool));
        console.log(error);
    }

    try {
        await insertMovie(pool1, isolationLevel, name, year, rank);
        console.log("Inserted new movie at node " + 1);
        res.redirect('/');
    }
    catch (error) {
        await log(errorPath, new Error(1, REPLICATION, UNRESOLVED));
        console.log("Could not add new movie to node " + 1);
        console.log(error);
        res.redirect('/');
    }
})



// TODO: add recovery stuff
updateMovie = (pool, isolationLevel, id, name, year, rank) => {
    var query = "DO SLEEP(15); UPDATE movies SET name = ?, year = ?, `rank` = ? WHERE " +
        "id = ?;";

    const NODE = getPoolNumber(pool);
    var newLog = new Update(NODE, id, name, year, rank, ABORTED);

    return new Promise((resolve, reject) => {

        pool.getConnection(function (error, connection) {
            if (error) return reject(error);
            
            connection.execute("SET AUTOCOMMIT=0");
            connection.execute("SET TRANSACTION ISOLATION LEVEL " + isolationLevel);
            connection.beginTransaction(function (error) {
                if (error) {
                    connection.rollback();
                    return reject(error);
                }
                // if (pool == pool3) {
                //     async function wait() {
                //         const sleep = ms => new Promise(r => setTimeout(r, ms));
                //         await sleep(15000) // await needs to be inside an async function
                //         // code after await and INSIDE THE FUNCTION is executed after the wait time
                //         // TODO: insert code to do after below
                //         console.log("After 15 seconds");
                //     }
                //     wait();
                // }
                connection.execute("SELECT * FROM movies WHERE id = ? FOR UPDATE;", [id]);
                connection.execute(query, [name, year, rank, id], function (error, results) {
                    if (error) {
                        connection.rollback();
                        log(historyPath, newLog);
                        log(errorPath, new Error(NODE, TRANSACTION, UNRESOLVED));
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

function getReplica(pool, year) {
    if(pool == pool1) {
        if (year >= 1980) {
            return pool3;
        }
        else {
            return pool2;
        }
    }
    else {
        return pool1
    }
}

app.get('/update', async function (req, res) {
    var id = req.query.id;
    var isolationLevel = req.query.isolationLevel;
    var pool = getPool(req.query.pool);
    var name = req.query.name;
    var year = req.query.year;
    var rank = req.query.rank;
    var replica = getReplica(pool, year);

    if(rank == "") {
        rank = null;
    }   

    try {
        updateMovie(pool, isolationLevel, id, name, year, rank);
        console.log("Updated " + id + " at node " + getPoolNumber(pool));
    }
    catch (error) {
        log(errorPath, new Error(getPoolNumber(pool), REPLICATION, UNRESOLVED));
        console.log("Could not update movie " + id + " at node " + getPoolNumber(pool));
        console.log(error);
    }

    try {
        updateMovie(replica, isolationLevel, id, name, year, rank);
        console.log("Updated movie " + id + " at node " + getPoolNumber(replica));
    }
    catch (error) {
        log(errorPath, new Error(getPoolNumber(replica), REPLICATION, UNRESOLVED));
        console.log("Could not update movie " + id + " at node " + getPoolNumber(replica));
        console.log(error);
        res.redirect('/');
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
    var pool = getPool(req.query.pool);

    if(req.query.pool == 1) {
        try {
            const result = await searchById(pool1, isolationLevel, id); 
            res.render('index', { tuple: result, pool: req.query.pool, level: req.query.isolationLevel}); 
        }
        catch(error) {
            // if node 1 is down try searching the other nodes 
            console.log("could not connect to node 1 trying other nodes")
            result = searchById(pool3, isolationLevel, id); 
            result.then(async (data) => {
                if(data.length == 0) {
                    try {
                        const result2 = await searchById(pool2, isolationLevel, id);
                        res.render('index', { tuple: result2, pool: req.query.pool, level: req.query.isolationLevel }); 
                    }
                    catch(error) {
                        console.log(error); 
                        res.redirect('/');
                    }
                }
                else {
                    res.render('index', { tuple: data, pool: req.query.pool, level: req.query.isolationLevel });
                }
            });
        }
    }
    else {
        try {
            const result = await searchById(pool, isolationLevel, id);
            res.render('index', { tuple: result, pool: req.query.pool, level: req.query.isolationLevel });
        } catch (error) {
            console.log(error);
            console.log("Could not connect to Node " + req.query.pool + ", trying connection with Node 1");
            const result = await searchById(pool1, isolationLevel, id);
            res.render('index', { tuple: result, pool: req.query.pool, level: req.query.isolationLevel });
        }
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
    res.render('index');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
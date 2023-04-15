const fs = require('fs');
const path = require('path');

const directoryPath = 'logs/';
const historyPath = 'logs/history.json';
const errorPath = 'logs/errors.json';

const date = new Date();

// Create the directory if it does not exist
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

log(historyPath, new Update(3, 1, "Pride and Prejudice", 2005, 10));

async function setResolved(index) {
    fs.readFile(errorPath, function (error, data) {
        if (error) console.log(error);

        var jsonContent = JSON.parse(data);
        jsonContent[index].status = "RESOLVED";
        var jsonString = JSON.stringify(jsonContent);
        fs.writeFile(errorPath, jsonString, function (error) {
            if (error) console.log(error);
        });

        // console.log(jsonContent[index]);
    })
}

// setResolved(3);

const chalk         = require("chalk")
const moment        = require('moment');

function logErr(msg) {
    console.log("[" + moment().format('DD/MM/YYYY HH:mm:ss') + "] " + chalk.red(msg))
}

module.exports.createTask = function(connection, title, description, priority, username) {
    var timestamp = moment().format('DD/MM/YYYY/HH/mm/ss')
    var set = {title: title, description: description, assignment: username, timestampCreated: timestamp, status: 0, priority: priority, timeDocumentation: "", timeDocumentationActive: "[]"}
    connection.query("INSERT INTO `tasks` SET ?", set, function (error, results, fields) {
        if (error) logErr(error)
    });
}

module.exports.updateTask = function(connection, id, title, description) {
    var set = {title: title, description: description}
    connection.query("UPDATE `tasks` SET ? WHERE `ID`=?", [set, id], function (error, results, fields) {
        if (error) logErr(error)
    });
}
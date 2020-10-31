const chalk         = require("chalk")


function logErr(msg) {
    const timestamp = new Date()
    console.log("[" + timestamp.getDay() + "/" + timestamp.getMonth() + "/" + timestamp.getFullYear() + " " + timestamp.getHours() + ":" + timestamp.getMinutes() + ":" + timestamp.getSeconds() + "] " + chalk.red(msg))
}

module.exports.createTask = function(connection, title, description, priority, username) {
    var date = new Date()
    var timestamp = date.getDay() + "/" + date.getMonth() + "/" + date.getFullYear() + "/" + date.getHours() + "/" + date.getMinutes() + "/" + date.getSeconds()
    var set = {title: title, description: description, assignment: username, timestampCreated: timestamp, status: 0, priority: priority}
    connection.query("INSERT INTO `tasks` SET ?", set, function (error, results, fields) {
        if (error) logErr(error)
    });
}
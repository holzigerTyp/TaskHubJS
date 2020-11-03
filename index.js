//////////////////////////////////////////////////
// TaskHubJS                                    //
//    https://github.com/holzigerTyp/TaskHubJS  //
//                                              //
// License: GNU General Public License v3.0     //
//////////////////////////////////////////////////

// Configuration //
var port = 4000
var version = undefined


// Init //
const moment        = require('moment');
const taskHandler   = require('./taskhandler')
const cookieparser  = require('cookie-parser')
const jwt           = require('jsonwebtoken')
const bcrypt        = require('bcrypt')
const fs            = require('fs')
const express       = require("express")
const app           = express()
const mysql         = require("mysql")
const chalk         = require("chalk")
var connection      = undefined

let default_config = {
    mysql_hostname: "localhost",
    mysql_port: 3306,
    mysql_username: "",
    mysql_password: "",
    mysql_database: "taskhubjs"
}


// Functions //
function printLogo() {
    console.log("                                                                           ")
    console.log(chalk.red(",--------.              ,--.    ,--.  ,--.        ,--.        ,--. ,---.   "))
    console.log(chalk.red("'--.  .--',--,--. ,---. |  |,-. |  '--'  |,--.,--.|  |-.      |  |'   .-'  "))
    console.log(chalk.red("   |  |  ' ,-.  |(  .-' |     / |  .--.  ||  ||  || .-. ',--. |  |`.  `-.  "))
    console.log(chalk.red("   |  |  \\ '-'  |.-'  `)|  \\  \\ |  |  |  |'  ''  '| `-' ||  '-'  /.-'    | "))
    console.log(chalk.red("   `--'   `--`--'`----' `--'`--'`--'  `--' `----'  `---'  `-----' `-----'  "))
    console.log(chalk.red("TaskHubJS version " + version + " @ https://github.com/holzigerTyp/TaskHubJS"))
    console.log("")
}
function logErr(msg) {
    console.log("[" + moment().format('DD/MM/YYYY HH:mm:ss') + "] " + chalk.red(msg))
}
function logSuc(msg) {
    console.log("[" + moment().format('DD/MM/YYYY HH:mm:ss') + "] " + chalk.green(msg))
}
function logCyan(msg) {
    console.log("[" + moment().format('DD/MM/YYYY HH:mm:ss') + "] " + chalk.cyan(msg))
}

function checkAuthentification(token, callback) {
    if(token != undefined) {
        connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", token, function (error, results, fields) {
            if (error) logErr(error)
            else {
                callback(results.length)
            }
          });
    } else callback(0)
}
function updateAuthentification(username, token) {
    var sql = "UPDATE `accounts` SET `authToken`='" + token + "' WHERE `username`='" + username + "'"
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function removeAuthentification(currentToken) {
    var sql = "UPDATE `accounts` SET `authToken`='0' WHERE `authToken`='" + currentToken + "'"
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function getUsername(token, callback) {
    if(token != undefined) {
        connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", token, function (error, results, fields) {
            if (error) logErr(error)
            else {
                callback(results[0].username)
            }
          });
    }
}

// Setup functions //
function updateVersion() {
    version = JSON.parse(fs.readFileSync('package.json')).version
}
function setup() {
    printLogo()
    if(fs.existsSync("config.json")) {
        var rawdata = fs.readFileSync('config.json');
        var config = JSON.parse(rawdata);
        if(!config.mysql_hostname || !config.mysql_port || !config.mysql_username || !config.mysql_password || !config.mysql_database) {
            console.log("Welcome to to TaskHubJS. A new and easy way to organize your tasks with NodeJS. ")
            console.log("")
            console.log("It looks like your credentials for the MySQL database are not filled in right now. \nPlease take a look at config.json and fill in your credentials.")
            process.exit()
        } else return
    }
    console.log("Welcome to to TaskHubJS. A new and easy way to organize your tasks with NodeJS.\nIn the following steps you are going to configure some things. Don't worry, it is not much.")
    console.log("")
    console.log("A config.json has been created. Please fill in your credentails and try again.")
    fs.writeFileSync("config.json", JSON.stringify(default_config, null, 2))
    process.exit()
}
function setupMySQLConnection() {
    var rawdata = fs.readFileSync('config.json');
    var config = JSON.parse(rawdata);
    connection = mysql.createConnection({
        host: config.mysql_hostname,
        port: config.mysql_port,
        user: config.mysql_username,
        password: config.mysql_password,
        database: config.mysql_database
    });
    connection.connect(function(error) {
        if (error) {
          logErr('An error with the MySQL connection occurred. Please check your MySQL credentials and the MySQL server.')
          process.exit()
        }
       
        logSuc('MySQL connection as ID ' + connection.threadId + ' successful');

        app.listen(port, function() {
            logSuc("Webserver started successful. View webpage at http://localhost:" + port)
        })
    });
}
function setupMySQLDatabase() {
    connection.query("SHOW TABLES LIKE 'tasks';", function (error, results, fields) {
        if (error) logErr(error)
        else {
            if(results.length != 1) {
                var rawdata = fs.readFileSync('config.json');
                var config = JSON.parse(rawdata);
                connection.query('CREATE TABLE `' + config.mysql_database + '`.`tasks` ( `ID` INT NOT NULL AUTO_INCREMENT , `title` VARCHAR(255) NOT NULL , `description` TEXT NOT NULL , `assignment` VARCHAR(255) NOT NULL , `timestampCreated` VARCHAR(255) NOT NULL , `status` INT NOT NULL , `priority` INT NOT NULL , PRIMARY KEY (`ID`)) ENGINE = InnoDB;', function (error, results, fields) {
                    if (error) logErr(error)
                });
            }
        }
      });

    connection.query("SHOW TABLES LIKE 'accounts';", function (error, results, fields) {
        if (error) logErr(error)
        else {
            if(results.length != 1) {
                var rawdata = fs.readFileSync('config.json');
                var config = JSON.parse(rawdata);
                connection.query('CREATE TABLE `' + config.mysql_database + '`.`accounts` ( `UID` INT NOT NULL AUTO_INCREMENT , `username` VARCHAR(255) NOT NULL , `hashed` TEXT NOT NULL , `authToken` VARCHAR(255) NOT NULL , `timestampLastLogin` VARCHAR(255) NOT NULL , `rank` VARCHAR(255) NOT NULL , PRIMARY KEY (`UID`)) ENGINE = InnoDB;', function (error, results, fields) {
                    if (error) logErr(error)
                    connection.query('INSERT INTO `accounts`(`UID`, `username`, `hashed`, `authToken`, `timestampLastLogin`, `rank`) VALUES (0,"admin","$2b$08$/EMn2iDepzRaThkXs/nEKOr9WbnTF2DjE364gr4vYGsQTNVf/sL4i","0","0","admin")', function (error, results, fields) {
                        if (error) logErr(error)
                    });
                });
            }
        }
    });

    connection.query('SELECT * FROM `accounts` WHERE `username`="admin"', function (error, results, fields) {
        if(results != undefined) {
            if(results.length != 1) {
                connection.query('INSERT INTO `accounts`(`UID`, `username`, `hashed`, `authToken`, `timestampLastLogin`, `rank`) VALUES (0,"admin","$2b$08$/EMn2iDepzRaThkXs/nEKOr9WbnTF2DjE364gr4vYGsQTNVf/sL4i","0","0","admin")', function (error, results, fields) {
                    if (error) logErr(error)
                });
            }
        }
      });

    logSuc("MySQL table validation finished.")
}

// MySQL functions //
function mysql_updatelogintimestamp(username) {
    var timestamp = moment().format('DD/MM/YYYY/HH/mm/ss')
    var sql = "UPDATE `accounts` SET `timestampLastLogin`='" + timestamp + "' WHERE `username`='" + username + "'"
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_gettasks(callback) {
    connection.query("SELECT * FROM `tasks`", function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results)
        }
    });
}
function mysql_gettaskdetails(id, callback) {
    var sql = 'SELECT * FROM `tasks` WHERE `ID`=' + id
    connection.query(sql, function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results)
        }
    });
}
function mysql_getaccounts(callback) {
    connection.query("SELECT `UID`, `username`, `timestampLastLogin`, `rank` FROM `accounts`", function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results)
        }
    });
}
function mysql_createaccount(username, password, prev) {
    var set = {username: username, hashed: bcrypt.hashSync(password, 8), authToken: 0, timestampLastLogin: 0, rank: prev}
    connection.query("INSERT INTO `accounts` SET ?", set, function (error, results, fields) {
        if (error) logErr(error)
    });
}
function mysql_changeadminpassword(password) {
    var sql = "UPDATE `accounts` SET `hashed`='" + bcrypt.hashSync(password, 8) + "' WHERE `username`='admin'"
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_deletetask(id) {
    var sql = "DELETE FROM `tasks` WHERE `ID`=" + id
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_getrank(token, callback) {
    if(token != undefined) {
        connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", token, function (error, results, fields) {
            if (error) {
                logErr(error)
                callback(0)
            } else {
                callback(results[0].rank)
            }
          });
    } else callback(0)
}
function mysql_deleteaccount(id) {
    var sql = "DELETE FROM `accounts` WHERE `UID`=" + id
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_changestatus(taskid, status) {
    var sql = "UPDATE `tasks` SET `status`=" + status + " WHERE `ID`=" + taskid
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_changepriority(taskid, priority) {
    var sql = "UPDATE `tasks` SET `priority`=" + priority + " WHERE `ID`=" + taskid
    connection.query(sql, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}

// Express //
app.use(function(req, res, next) {
    if(!req.url.includes(".css") && !req.url.includes(".js") && !req.url.includes(".woff2") && !req.url.includes(".jpg") && !req.url.includes(".ico")) logCyan("GET -> "+ req.url + " -> " + req.ip)
    next()
})

app.use(express.static('./public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cookieparser())
app.set('view engine', 'hbs')

app.get("/", function(req, res) {
    res.render("index")
})
app.get("/login", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            res.redirect("/dashboard")
        } else res.render("login")
    }) 
    
})
app.get("/logout", function(req, res) {
    removeAuthentification(req.cookies.auth)
    res.redirect("/")
})
app.get("/error", function(req, res) {
    res.render("error")
})

app.get("/dashboard", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) res.render("dashboard")
        else res.redirect("/login")
    })   
})
app.get("/dashboard/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) res.render("dashboard-details")
        else res.redirect("/login")
    })   
})

app.get("/management", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") res.render("management")
                else res.render("error-rank")
            })
        } else res.redirect("/login")
    })   
})
app.get("/management/createaccount", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") res.render("create-account")
                else res.render("error-rank")
            })
        } else res.redirect("/login")
    })   
})
app.get("/management/changeadminpassword", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") res.render("change-adminpassword")
                else res.render("error-rank")
            })
        } else res.redirect("/login")
    })   
})

app.get("/createtask", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) res.render("create-task")
        else res.redirect("/login")
    }) 
})

app.post("/api/auth", function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    connection.query("SELECT * FROM `accounts` WHERE `username`=?", username, function (error, results, fields) {
        if (error) logErr(error)
        else {
            if(results.length == 1) {
                bcrypt.compare(password, results[0].hashed, (err, result) => {
                    if(result == true) {
                        mysql_updatelogintimestamp(username)
                        var id = results[0].ID
                        var token = jwt.sign({id}, "TASKHUBJS_BY_HOLZIGERTYP", {expiresIn: "90d"})
                        res.cookie('auth', token, {
                            expires: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)), 
                            httpOnly: true
                        })
                        updateAuthentification(username, token)
                        res.status(200).redirect("/dashboard")
                    } else res.redirect("/login")
                })
            } else res.redirect("/login")
        }
      });
})
app.post("/api/createtask", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var title = req.body.title
            var description = req.body.description
            getUsername(req.cookies.auth, (username) => {
                taskHandler.createTask(connection, title, description, 1, username)
            })
            res.redirect("/dashboard")
        } else res.redirect("/login")
    })  
})
app.get("/api/deletetask/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_deletetask(req.params.id)
            res.redirect("/dashboard")
        } else res.redirect("/login")
    })  
})
app.get("/api/gettasks", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_gettasks((list) => {
                res.setHeader("Content-Type", "application/json")
                res.status(200).send(list)
            })
        } else res.redirect("/login")
    })  
})
app.get("/api/gettaskdetail/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_gettaskdetails(req.params.id, (list) => {
                res.setHeader("Content-Type", "application/json")
                res.status(200).send(list)
            })
        } else res.redirect("/login")
    })  
})
app.get("/api/getaccounts", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") {
                    mysql_getaccounts((list) => {
                        res.setHeader("Content-Type", "application/json")
                        res.status(200).send(list)
                    })
                } else res.render("error-rank")
            })
            
        } else res.redirect("/login")
    })  
})
app.post("/api/createaccount", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") {
                    var username = req.body.username
                    var password = req.body.password
                    var prev = req.body.prev
                    mysql_createaccount(username, password, prev)
                    res.redirect("/management")
                } else res.render("error-rank")
            })
        } else res.redirect("/login")
    })  
})
app.get("/api/deleteaccount/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") {
                    mysql_deleteaccount(req.params.id)
                    res.redirect("/management#accounts")
                } else res.render("error-rank")
            })
        } else res.redirect("/login")
    })  
})
app.post("/api/changeadminpassword", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") {
                    var password = req.body.password
                    mysql_changeadminpassword(password)
                    res.redirect("/management")
                } else res.render("error-rank")
            })
        } else res.redirect("/login")
    })  
})
app.post("/api/changestatus/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var status = req.body.status
            var id = req.params.id
            mysql_changestatus(id, status)
            res.redirect("/dashboard/" + id)
        } else res.redirect("/login")
    })  
})
app.post("/api/changepriority/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var priority = req.body.priority
            var id = req.params.id
            mysql_changepriority(id, priority)
            res.redirect("/dashboard/" + id)
        } else res.redirect("/login")
    })  
})

// Start //
updateVersion()
setup()
setupMySQLConnection()
setupMySQLDatabase()
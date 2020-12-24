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
const cookiesession  = require('cookie-session')
const jwt           = require('jsonwebtoken')
const bcrypt        = require('bcrypt')
const fs            = require('fs')
const express       = require("express")
const app           = express()
const mysql         = require("mysql")
const chalk         = require("chalk")
const csrf          = require("csurf")
const https			= require("https")
var connection      = undefined

const ratelimit     = require("express-rate-limit");
const { config } = require('process');
const limiter = ratelimit({
    windowMs: 1 * 60 * 1000,
    max: 140
})

let default_config = {
    mysql_hostname: "localhost",
    mysql_port: 3306,
    mysql_username: "",
    mysql_password: "",
    mysql_database: "taskhubjs",
    taskhubjs_debug_output: false,
    taskhubjs_check_for_updates: true,
    taskhubjs_secret: "hWS023nf83guu8GS93",
    taskhubjs_keys: "9iu2t98nsiuHSO289",
    taskhubjs_sign_for_token: "TASKHUBJS_BY_HOLZIGERTYP"
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
    if(token == undefined) { callback(0); return; }
    connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", token, function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results.length)
        }
    });
}
function updateAuthentification(username, token) {
    var sql = "UPDATE `accounts` SET `authToken`=? WHERE `username`=?"
    connection.query(sql, [token, username], function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function removeAuthentification(currentToken) {
    var sql = "UPDATE `accounts` SET `authToken`='0' WHERE `authToken`=?"
    connection.query(sql, currentToken, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function getUsername(token, callback) {
    if(token == undefined) { callback(undefined); return; }
    connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", token, function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results[0].username)
        }
        });
}
function getUserID(token, callback) {
    if(token == undefined) { callback(undefined); return; }
    connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", [token], function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results[0].UID)
        }
    });
}

// Theme functions //
function toggleTheme(uid) {
    mysql_gettheme(uid, function(currentTheme) {
        if(currentTheme == 1) mysql_changetheme(uid, 0)
        else mysql_changetheme(uid, 1)
    })
}

// Time documentation functions //
function startLogging(taskid, uid) {
    getActiveLogging(taskid, function(out) {
        var ar = JSON.parse(out)
        if(!ar.includes(uid)) {
            ar.push(uid)
            var json = JSON.stringify(ar)
            var sql = "UPDATE `tasks` SET `timeDocumentationActive`=? WHERE `ID`=?"
            connection.query(sql, [json,taskid], function (error, results, fields) {
                if (error) {
                    logErr(error)
                    return false
                } else return true
            })
        }
        
    })
}
function stopLogging(taskid, uid) {
    getActiveLogging(taskid, function(out) {
        var ar = JSON.parse(out)
        if(ar.includes(uid)) {
            var ind = ar.indexOf(uid);
            if (ind > -1) {
                ar.splice(ind, 1);
            }
            var json = JSON.stringify(ar)
            var sql = "UPDATE `tasks` SET `timeDocumentationActive`=? WHERE `ID`=?"
            connection.query(sql, [json,taskid], function (error, results, fields) {
                if (error) {
                    logErr(error)
                    return false
                } else return true
            })
        }
        
    })
}
function getActiveLogging(taskid, callback) {
    connection.query("SELECT `timeDocumentationActive` FROM `tasks` WHERE `ID`=?", taskid, function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results[0].timeDocumentationActive)
        }
    });
}
function getLogging(taskid, callback) {
    connection.query("SELECT `timeDocumentation` FROM `tasks` WHERE `ID`=?", taskid, function (error, results, fields) {
        if (error) logErr(error)
        else {
            callback(results[0].timeDocumentation)
        }
    });
}
var loggingArray;
var loggingIndex;
function getLoggingWithIDs(taskid, callback) {
    connection.query("SELECT `timeDocumentation` FROM `tasks` WHERE `ID`=?", taskid, function (error, results, fields) {
        if (error) logErr(error)
        else {
            if(results[0].timeDocumentation == "") {
                callback([])
            } else {
                loggingArray = JSON.parse(results[0].timeDocumentation)
            
                for(var i = 0; i < loggingArray.length; i++) {
                    var uid = parseInt(loggingArray[i][0].replace("uid", ""))
                    loggingArray[i][0] = uid
                }

                getLoggingUsernames()
                setTimeout(() => callback(loggingArray), 400)
            }
        }
    });
}
function getLoggingUsernames() {
    for(var i = 0; i < loggingArray.length; i++) {
        (function(i) {
            setTimeout(function() {
                loggingIndex = i
                mysql_getusernamebyid(loggingArray[i][0], (out) => {
                    setLoggingUsername(out)
                })
            }, i * 200)
        }(i))
    }
}
function setLoggingUsername(username) {
    loggingArray[loggingIndex][0] = username
}
function addSecondToLogging(taskid, uid) {
    getLogging(taskid, function(out) {
        var map = undefined
        if(out == "") {
            map = new Map()
            map.set("uid" + uid, 2)
        } else {
            map = new Map(JSON.parse(out))
            if(map.get("uid" + uid) == undefined) {
                map.set("uid" + uid, 2)
            } else {
                var currentSecs = parseInt(map.get("uid" + uid).toString())
                map.set("uid" + uid, currentSecs+2)
            }
        }
        var maparray = JSON.stringify(Array.from(map))
        var sql = "UPDATE `tasks` SET `timeDocumentation`=? WHERE `ID`=?"
        connection.query(sql, [maparray, taskid], function (error, results, fields) {
            if (error) {
                logErr(error)
                return false
            } else return true
        })
    })
}
function updateLogging() {
    mysql_gettasks(function(res) {
        for(var i = 0; i < res.length; i++) {
            var taskid = res[i].ID
            getActiveLogging(taskid, function(out) {
                var ar = JSON.parse(out)
                for(var i1 = 0; i1 < ar.length; i1++) {
                    (function(i1) {
                        setTimeout(function() {
                            var uid = ar[i1]
                            addSecondToLogging(taskid, uid)
                        }, i1 * 500)
                    }(i1))
                }
                
            })
        }
    })
}


// Setup functions //
function updateVersion() {
    version = JSON.parse(fs.readFileSync('package.json')).version
    try {
		if(JSON.parse(fs.readFileSync('config.json')).taskhubjs_check_for_updates == true) checkVersion()
    } catch (ENOENT) {
		return
    }
}
function checkVersion() {
	var req = https.request({host: 'api.github.com', port: 443, path: '/repos/holzigerTyp/TaskHubJS/releases/latest', method: 'GET', headers: {'Content-Type': 'application/json', 'user-agent': 'node.js'}}, function(res) {
		var out = '';
		res.setEncoding('utf8')
		res.on('data', function(c) {
			out += c
		})
		res.on('end', function() {
			var json = JSON.parse(out)
			if(json.tag_name.replace("v", "") != version) logCyan("A newer version is available (" + json.tag_name.replace("v", "") + "). You can download it at the following link. (https://github.com/holzigerTyp/TaskHubJS/releases/tag/" + json.tag_name + ") \nPlease take also a look at the upgrade instructions.")
				else logSuc("You are using the newest version of TaskHubJS.")
		})
	})
	req.end()
}


function setup() {
    printLogo()
    if(fs.existsSync("config.json")) {
        var rawdata = fs.readFileSync('config.json');
        var config = JSON.parse(rawdata);
        if(!config.mysql_hostname || !config.mysql_port || !config.mysql_username || !config.mysql_password || !config.mysql_database || !config.taskhubjs_secret || !config.taskhubjs_keys || !config.taskhubjs_sign_for_token) {
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
        if(config.taskhubjs_debug_output == true) logCyan("Activated debug output by config")

        app.listen(port, function() {
            logSuc("Webserver started successful. View webpage at http://localhost:" + port)
            setInterval(() => updateLogging(), 2000)
        })
    });
}
function setupMySQLDatabase() {
    connection.query("SHOW TABLES LIKE 'tasks';", function (error, results, fields) {
        if (error) logErr(error)
        else {
            if(results.length == 1) return

            var rawdata = fs.readFileSync('config.json');
            var config = JSON.parse(rawdata);

            connection.query('CREATE TABLE `' + config.mysql_database + '`.`tasks` ( `ID` INT NOT NULL AUTO_INCREMENT , `title` VARCHAR(255) NOT NULL , `description` TEXT NOT NULL , `assignment` VARCHAR(255) NOT NULL , `timestampCreated` VARCHAR(255) NOT NULL , `status` INT NOT NULL , `priority` INT NOT NULL , `timeDocumentation` VARCHAR(255) NOT NULL , `timeDocumentationActive` VARCHAR(255) NOT NULL , PRIMARY KEY (`ID`)) ENGINE = InnoDB;', function (error, results, fields) {
                if (error) logErr(error)
            });
        }
      });

    connection.query("SHOW TABLES LIKE 'accounts';", function (error, results, fields) {
        if (error) logErr(error)
        else {
            if(results.length == 1) return

            var rawdata = fs.readFileSync('config.json');
            var config = JSON.parse(rawdata);

            connection.query('CREATE TABLE `' + config.mysql_database + '`.`accounts` ( `UID` INT NOT NULL AUTO_INCREMENT , `username` VARCHAR(255) NOT NULL , `hashed` TEXT NOT NULL , `authToken` VARCHAR(255) NOT NULL , `timestampLastLogin` VARCHAR(255) NOT NULL , `rank` VARCHAR(255) NOT NULL , `theme` INT NOT NULL , PRIMARY KEY (`UID`)) ENGINE = InnoDB;', function (error, results, fields) {
                if (error) logErr(error)
                connection.query('INSERT INTO `accounts`(`UID`, `username`, `hashed`, `authToken`, `timestampLastLogin`, `rank`, `theme`) VALUES (0,"admin","$2b$08$/EMn2iDepzRaThkXs/nEKOr9WbnTF2DjE364gr4vYGsQTNVf/sL4i","0","0","admin",0)', function (error, results, fields) {
                    if (error) logErr(error)
                });
            });
        }
    });

    connection.query('SELECT * FROM `accounts` WHERE `username`="admin"', function (error, results, fields) {
        if(results == undefined) return
        if(results.length == 1) return

        connection.query('INSERT INTO `accounts`(`UID`, `username`, `hashed`, `authToken`, `timestampLastLogin`, `rank`, `theme`) VALUES (0,"admin","$2b$08$/EMn2iDepzRaThkXs/nEKOr9WbnTF2DjE364gr4vYGsQTNVf/sL4i","0","0","admin",0)', function (error, results, fields) {
            if (error) logErr(error)
        });
      });

    logSuc("MySQL table validation finished.")
}
function debugOutput() {
    if(!fs.existsSync("config.json")) return

    var rawdata = fs.readFileSync('config.json');
    var config = JSON.parse(rawdata);
    if(config.taskhubjs_debug_output != true) return

    app.use(function(req, res, next) {
        if(!req.url.includes(".css") && !req.url.includes(".js") && !req.url.includes(".woff2") && !req.url.includes(".jpg") && !req.url.includes(".ico")) logCyan(req.method + " -> " + req.url + " -> " + req.ip)
        next()
    })
}

// MySQL functions //
function mysql_updatelogintimestamp(username) {
    var timestamp = moment().format('DD/MM/YYYY/HH/mm/ss')
    var sql = "UPDATE `accounts` SET `timestampLastLogin`=? WHERE `username`=?"

    connection.query(sql, [timestamp,username], function (error, results, fields) {
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
    var sql = 'SELECT * FROM `tasks` WHERE `ID`=?'
    connection.query(sql, id, function (error, results, fields) {
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
    var set = {username: username, hashed: bcrypt.hashSync(password, 8), authToken: 0, timestampLastLogin: 0, rank: prev, theme: 0}
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
    var sql = "DELETE FROM `tasks` WHERE `ID`=?"
    connection.query(sql, id, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_getrank(token, callback) {
    if(token == undefined) { callback(0); return; }

    connection.query("SELECT * FROM `accounts` WHERE `authToken`=?", token, function (error, results, fields) {
        if (error) {
            logErr(error)
            callback(0)
        } else {
            callback(results[0].rank)
        }
    });
}
function mysql_getusernamebyid(id, callback) {
    if(id == undefined) { callback(0); return; }

    connection.query("SELECT * FROM `accounts` WHERE `UID`=?", id, function (error, results, fields) {
        if (error) {
            logErr(error)
            callback(0)
        } else {
            if(results[0] == undefined) callback(0)
            else callback(results[0].username)
        }
    });
}
function mysql_deleteaccount(id) {
    var sql = "DELETE FROM `accounts` WHERE `UID`=?"
    connection.query(sql, id, function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_changestatus(taskid, status) {
    var sql = "UPDATE `tasks` SET `status`=? WHERE `ID`=?"
    connection.query(sql, [status,taskid], function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_changepriority(taskid, priority) {
    var sql = "UPDATE `tasks` SET `priority`=? WHERE `ID`=?"
    connection.query(sql, [priority,taskid], function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_changeassign(taskid, username) {
    var sql = "UPDATE `tasks` SET `assignment`=? WHERE `ID`=?"
    connection.query(sql, [username,taskid], function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_usernameexists(username, callback) {
    if(username == undefined) { callback(false); return; }

    connection.query("SELECT * FROM `accounts` WHERE `username`=?", username, function (error, results, fields) {
        if (error) {
            logErr(error)
            callback(false)
        } else {
            if(results[0] == undefined) callback(false)
            else callback(true)
        }
    });
}

function mysql_changetheme(uid, val) {
    var sql = "UPDATE `accounts` SET `theme`=? WHERE `UID`=?"
    connection.query(sql, [val,uid], function (error, results, fields) {
        if (error) {
            logErr(error)
            return false
        } else return true
    })
}
function mysql_gettheme(uid, callback) {
    connection.query("SELECT * FROM `accounts` WHERE `UID`=?", uid, function (error, results, fields) {
        if (error) {
            logErr(error)
            callback(0)
        } else {
            callback(results[0].theme)
        }
    });
}

// Express //
debugOutput()

app.use(express.static('./public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(limiter)
app.use(cookiesession({ secret: config.taskhubjs_secret, keys: ["" + config.taskhubjs_keys] }))

// csurf //
app.use(csrf())
app.use(function(err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err)
 
    res.status(403)
    res.send('Session has expired or form tampered with')
})
app.use(function(req, res, next) {
    res.locals.csrftoken = req.csrfToken()
    next()
})

app.use(cookieparser())
app.set('view engine', 'ejs')

app.get("/", function(req, res) {
    res.render("index")
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
        else res.redirect("/")
    })   
})

app.get("/management", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") res.render("management")
                else res.render("error")
            })
        } else res.redirect("/")
    })   
})
app.get("/management/createaccount", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") res.render("create-account")
                else res.render("error")
            })
        } else res.redirect("/")
    })   
})
app.get("/management/changeadminpassword", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") res.render("change-adminpassword")
                else res.render("error")
            })
        } else res.redirect("/")
    })   
})

app.get("/createtask", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) res.render("create-task")
        else res.redirect("/")
    }) 
})

app.get("/updatetask/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) res.render("update-task")
        else res.redirect("/")
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
                        var rawdata = fs.readFileSync('config.json');
                        var config = JSON.parse(rawdata);
                        var token = jwt.sign({id}, config.taskhubjs_sign_for_token, {expiresIn: "90d"})
                        res.cookie('auth', token, {
                            expires: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)), 
                            httpOnly: true
                        })
                        updateAuthentification(username, token)
                        res.status(200).redirect("/dashboard")
                    } else res.redirect("/")
                })
            } else res.redirect("/")
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
                res.redirect("/dashboard/")
            })
        } else res.redirect("/")
    })  
})
app.post("/api/updatetask/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var title = req.body.updatetitle
            var description = req.body.updatedescription
            var status = req.body.updatestatus
            var priority = req.body.updatepriority
            var id = req.params.id

            taskHandler.updateTask(connection, id, title, description, status, priority)
            res.redirect("/dashboard")
        } else res.redirect("/")
    })  
})
app.get("/api/deletetask/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_deletetask(req.params.id)
            res.redirect("/dashboard")
        } else res.redirect("/")
    })  
})
app.get("/api/gettasks", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_gettasks((list) => {
                res.setHeader("Content-Type", "application/json")
                res.status(200).send(list)
            })
        } else res.redirect("/")
    })  
})
app.get("/api/gettaskdetail/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_gettaskdetails(req.params.id, (list) => {
                res.setHeader("Content-Type", "application/json")
                res.status(200).send(list)
            })
        } else res.redirect("/")
    })  
})
app.get("/api/getusername/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getusernamebyid(req.params.id, (list) => {
                res.setHeader("Content-Type", "application/json")
                res.status(200).send(list + "")
            })
        } else res.redirect("/")
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
                } else res.render("error")
            })
            
        } else res.redirect("/")
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
                } else res.render("error")
            })
        } else res.redirect("/")
    })  
})
app.get("/api/deleteaccount/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            mysql_getrank(req.cookies.auth, (rank) => {
                if(rank == "admin") {
                    mysql_deleteaccount(req.params.id)
                    res.redirect("/management")
                } else res.render("error")
            })
        } else res.redirect("/")
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
                } else res.render("error")
            })
        } else res.redirect("/")
    })  
})
app.post("/api/changestatus/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var status = req.body.status
            var id = req.params.id

            mysql_changestatus(id, status)
            res.redirect("/dashboard/" + id + "#settings")
        } else res.redirect("/")
    })  
})
app.post("/api/changepriority/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var priority = req.body.priority
            var id = req.params.id

            mysql_changepriority(id, priority)
            res.redirect("/dashboard/" + id + "#settings")
        } else res.redirect("/")
    })  
})
app.post("/api/changeassign/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            var username = req.body.username
            mysql_usernameexists(username, (out) => {
                var id = req.params.id
                if(out == true) {
                    mysql_changeassign(id, username)
                    res.redirect("/dashboard/" + id + "#settings")
                } else res.redirect("/dashboard/" + id + "#settings")
            })
        } else res.redirect("/")
    })  
})

app.get("/api/getlogging/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            getLoggingWithIDs(req.params.id, function(out) {
                res.setHeader("Content-Type", "application/json")
                res.status(200).send(out)
            })
        } else res.redirect("/")
    })  
})
app.get("/api/startlogging/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            getUserID(req.cookies.auth, function(uid) {
                startLogging(req.params.id, uid)
                res.redirect("/dashboard")
            })
        } else res.redirect("/")
    })  
})
app.get("/api/stoplogging/:id", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            getUserID(req.cookies.auth, function(uid) {
                stopLogging(req.params.id, uid)
                res.redirect("/dashboard")
            })
        } else res.redirect("/")
    })  
})
app.get("/api/toggletheme", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            getUserID(req.cookies.auth, function(uid) {
                toggleTheme(uid)
            })
        } else res.redirect("/")
    })  
})

app.get("/api/gettheme", function(req, res) {
    checkAuthentification(req.cookies.auth, (result) => {
        if(result == 1) {
            getUserID(req.cookies.auth, function(uid) {
                mysql_gettheme(uid, function(theme) {
                    res.setHeader("Content-Type", "application/json")
                    res.status(200).send({"theme": theme})
                })
            })
        } else res.redirect("/")
    })  
})

// Start //
updateVersion()
setup()
setupMySQLConnection()
setupMySQLDatabase()
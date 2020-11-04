function initTasks() {
    $.ajax({
        type: "GET",
        url: "http://localhost:4000/api/gettasks",
        crossDomain: false,
        dataType: "json",
        success: function(data) {
            if(data.length != 0) {
                for (var i = 0; i < data.length; i++) {
                    var stat = "Error"
                    var col = ""
                    if(data[i].status == 0) {
                        stat = "Open"
                        col = "primary"
                    } else if(data[i].status == 1) {
                        stat = "In progress"
                        col = "warning"
                    } else if(data[i].status == 2) {
                        stat = "Finished"
                        col = "success"
                    } else if(data[i].status == 3) {
                        stat = "Information"
                        col = "info"
                    }
    
    
                    var prio = "Error"
                    var colPrio = ""
                    if(data[i].priority == 0) {
                        prio = "Low"
                        colPrio = "secondary"
                    } else if(data[i].priority == 1) {
                        prio = "Normal"
                        colPrio = "info"
                    } else if(data[i].priority == 2) {
                        prio = "Urgent"
                        colPrio = "danger"
                    }
                    var doc = document.getElementById("overview")
                    doc.innerHTML = doc.innerHTML + '<div class="col-12 col-md-6 col-lg-4 sys-col" id="' + stat.toLowerCase() + '/' + prio.toLowerCase() + '"><div class="clean-product-item"><div class="image"><a href="#"></a></div><div class="product-name"><a href="/dashboard/' + data[i].ID + '">' + data[i].title + '</a></div><div class="about"><div class="rating"><span class="badge badge-' + col + '">' + stat + '</span></div><div class="price"><span class="badge badge-primary badge-' + colPrio + '">' + prio + '</span></div></div></div></div>'
                }
            } else {
                var doc = document.getElementById("overview")
                    doc.innerHTML = doc.innerHTML + '<div class="col-12 col-md-6 col-lg-4"><div class="clean-product-item"></div></div><div class="col-12 col-md-6 col-lg-4"><div class="clean-product-item"><div class="image"><a href="#"></a></div><div class="product-name"><a>No tasks found.</a></div><div class="about"></div></div></div><div class="col-12 col-md-6 col-lg-4"><div class="clean-product-item"></div></div>'
            }
        }
    });
}

function clearTaskList() {
    var doc = document.getElementById("overview")
    doc.innerHTML = ""
}

function initTasksExceptFilter() {
    var open = document.getElementById("filter-open");
    var inprog = document.getElementById("filter-inprogress");
    var finished = document.getElementById("filter-finished");
    var info = document.getElementById("filter-information");

    var low = document.getElementById("filter-low");
    var normal = document.getElementById("filter-normal");
    var urgent = document.getElementById("filter-urgent");

    $.ajax({
        type: "GET",
        url: "http://localhost:4000/api/gettasks",
        crossDomain: false,
        dataType: "json",
        success: function(data) {
            if(data.length != 0) {
                for (var i = 0; i < data.length; i++) {
                    var stat = "Error"
                    var col = ""
                    if(data[i].status == 0) {
                        stat = "Open"
                        col = "primary"
                    } else if(data[i].status == 1) {
                        stat = "In progress"
                        col = "warning"
                    } else if(data[i].status == 2) {
                        stat = "Finished"
                        col = "success"
                    } else if(data[i].status == 3) {
                        stat = "Information"
                        col = "info"
                    }
    
    
                    var prio = "Error"
                    var colPrio = ""
                    if(data[i].priority == 0) {
                        prio = "Low"
                        colPrio = "secondary"
                    } else if(data[i].priority == 1) {
                        prio = "Normal"
                        colPrio = "info"
                    } else if(data[i].priority == 2) {
                        prio = "Urgent"
                        colPrio = "danger"
                    }
                    var doc = document.getElementById("overview")
                    if(stat == "Open" && open.checked) insertTask(doc, stat, col, prio, colPrio, data, i)
                    if(stat == "In progress" && inprog.checked) insertTask(doc, stat, col, prio, colPrio, data, i)
                    if(stat == "Finished" && finished.checked) insertTask(doc, stat, col, prio, colPrio, data, i)
                    if(stat == "Information" && info.checked) insertTask(doc, stat, col, prio, colPrio, data, i)

                    if(prio == "Low" && low.checked) insertTask(doc, stat, col, prio, colPrio, data, i)
                    if(prio == "Normal" && normal.checked) insertTask(doc, stat, col, prio, colPrio, data, i)
                    if(prio == "Urgent" && urgent.checked) insertTask(doc, stat, col, prio, colPrio, data, i)
                }
                if(document.getElementById("overview").innerHTML === "") {
                    insertErrorTask()
                }
            } else {
                insertErrorTask()
            }
        }
    });
}

function insertTask(doc, stat, col, prio, colPrio, data, i) {
    doc.innerHTML = doc.innerHTML + '<div class="col-12 col-md-6 col-lg-4 sys-col" id="' + stat.toLowerCase() + '/' + prio.toLowerCase() + '"><div class="clean-product-item"><div class="image"><a href="#"></a></div><div class="product-name"><a href="/dashboard/' + data[i].ID + '">' + data[i].title + '</a></div><div class="about"><div class="rating"><span class="badge badge-' + col + '">' + stat + '</span></div><div class="price"><span class="badge badge-primary badge-' + colPrio + '">' + prio + '</span></div></div></div></div>'
}
function insertErrorTask() {
    var doc = document.getElementById("overview")
    doc.innerHTML = doc.innerHTML + '<div class="col-12 col-md-6 col-lg-4"><div class="clean-product-item"></div></div><div class="col-12 col-md-6 col-lg-4"><div class="clean-product-item"><div class="image"><a href="#"></a></div><div class="product-name"><a>No tasks found.</a></div><div class="about"></div></div></div><div class="col-12 col-md-6 col-lg-4"><div class="clean-product-item"></div></div>'
}

initTasks()
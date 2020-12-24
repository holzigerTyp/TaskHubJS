 $.ajax({
    type: "GET",
    url: window.location.protocol + '//' + window.location.host + "/api/gettheme",
    crossDomain: false,
    dataType: "json",
    success: function(data) {
        var theme = parseInt(data.theme)
        if(theme == 1) document.getElementById("style").href = "/css/dark.css"
        else document.getElementById("style").href = "/css/light.css"
    }
});
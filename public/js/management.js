$.ajax({
    type: "GET",
    url: window.location.protocol + '//' + window.location.host + "/api/gettheme",
    crossDomain: false,
    dataType: "json",
    success: function(data) {
        var theme = parseInt(data.theme)
        if(theme == 1) $("#switchTheme").prop('checked', true)
        else $("#switchTheme").prop('checked', false)
    }
});

$("#switchTheme").change(function() {
    toggleTheme()
});
function toggleTheme() {
	$.ajax({
            type: "GET",
            url: window.location.protocol + '//' + window.location.host + "/api/toggletheme",
            crossDomain: false,
            dataType: "json",
            success: function(data) {
                window.location.reload();
            }
    });
    window.location.reload();
}
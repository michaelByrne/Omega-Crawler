/***  Team Omega - CS419_400 WebCrawl ***/

//Globally shared with sketch.js for visualization.
var node_locations = [];
var data_avail = false;
var vis_height = 0;
var vis_width = 0;
var center_adjust = 0;
var local_count = 0;
var local_avail = false;
var vis_count = 0;
var vis_player = null;
var termString = null;


var order = null;
var isCollapsed = false;
var visTree = new TreeSpace();


/************************************************************
 * Function clears any user input data, and removes previous tables/visulizations from the page.
 ************************************************************/
function reset() {
    var div;
    //Reset History selection, including call to lockInput to renable disabled fields.
    document.getElementById("history").selectedIndex = 0;
    lockInput();
    //Reset input field values.
    document.getElementById("url").value = "";
    document.getElementById("max").value = "";
    document.getElementById("term").value = "";
    document.getElementById("method").checked = true;
    document.getElementById("limit").value = "";
    //Finally clear any prior Crawler results tables/visualizations.
    div = document.getElementById("table");
    while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
    div = document.getElementById("vis");
    while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
    historyBuild();
}
/******* End of reset() *******/



/************************************************************
 * Function evaluates user input data, and either initiates a call for a new WebCrawl via an HTTP
 * call to the PHP middleware, or if localStorage is invoked loads local stored crawl data.  From
 * this data a results table is displayed along with a visualization of the crawler results.
 ************************************************************/
function new_crawl() {
    var div, cell, text, results;
    $("title_card").fadeOut("fast");
    $("#table").hide();
    $(".cs-loader").show();
    //Clear the table and vis from any previous tables or errors:
    data_avail = false;
    div = document.getElementById("table");
    while (div.hasChildNodes()) { div.removeChild(div.lastChild); }
    div = document.getElementById("vis");
    while (div.hasChildNodes()) { div.removeChild(div.lastChild); }

    //Check if this is a new crawl, or a history crawl.
    if (document.getElementById("history").value != "blank"){
        //For History crawl's we simply pull the response data from localStorage.
        results = JSON.parse(localStorage.getItem(document.getElementById("history").value));
        //table_build(results);
        vis_count = results.Count;
        isCollapsed = false;
        visualization(results);
        table_build(results);

    }
    //If not a history crawl, kick off a new web_crawl with user input parameters.
    else{
        //Temporarily add a comment to screen that web_crawl is underway to alert user
        //that all is well on a overly long web_crawl.
        div = document.getElementById("table");
        cell = document.createElement("caption");
        cell.setAttribute("id", "vis_header");
        //text = document.createTextNode("One Moment, WebCrawler is Crawling...");
        //cell.appendChild(text);
        div.appendChild(cell);
        //cell = document.createElement("img");
        //cell.setAttribute("src", "IMG/in_prog.gif");
        //div.appendChild(cell);

        //Initate a new HTTP request to PHP middleware.
        var http_request = new XMLHttpRequest();
        var request_url = "https://web.engr.oregonstate.edu/~byrnemi/process.php?";

        //Add query parameters per user input:
        request_url += "start=" + document.getElementById("url").value;
        request_url += "&max=" + document.getElementById("max").value;
        request_url += "&limit=" + document.getElementById("limit").value;
        request_url += "&method=";

        var e = document.getElementById("method");
        var opt = e.options[e.selectedIndex].value;
        if (opt == "BF") { request_url += "BF"; }
        else { request_url += "DF"; }
        if (document.getElementById("term").value != "") { 
            request_url += "&term=" + document.getElementById("term").value;
            termString = document.getElementById("term").value; 
        }

        //Make request and evalute response.
        http_request.open('GET', request_url);
        http_request.send();
        http_request.onreadystatechange = function () {
            if (this.readyState === 4) {
                results = JSON.parse(this.responseText);
                if (results.Result == 0){
                    //Display valid results in table/visualization.
                    table_build(results);
                    vis_count = results.Count;
                    visualization(results);
                    //And if localStorage is available save results for Search History.
                    if(local_avail) {
                        localStorage.setItem("omega_spr_16_" + local_count, this.responseText);
                        local_count++;
                        historyBuild();  //Redraw history dropdown with latest search added.
                    }
                }
                //Otherwise if invalid return, print error message.
                else {
                    error_report(results);
                }
            }
        }
    }
}
/******* End of new_crawl() *******/



/************************************************************
 * Function simply prints the Error Code, and Error Text from the 'results' JSON object parameter to
 * screen.  Will clear any previous table/visualization before presenting error.
 ************************************************************/
function error_report(results){
    noLoop();
    var page = document.getElementById("table");
    var vis = document.getElementById("vis");
    var cell, text;
    $(".cs-loader").hide();
    $("#table").show();
    $("form").hide();
    $(".title_card").hide();


    //Clear the table and vis from any previous tables or errors:
    while (page.hasChildNodes()) { page.removeChild(page.lastChild); }
    page = document.getElementById("page");
    while (page.hasChildNodes()) { page.removeChild(page.lastChild); }

    while (vis.hasChildNodes()) { vis.removeChild(vis.lastChild); }
    vis = document.getElementById("vis");
    while (vis.hasChildNodes()) { vis.removeChild(vis.lastChild); }

    //Write error code and message to page:
    cell = document.createElement('p');
    text = document.createTextNode("Error Received, Error Code = " + results.Result);
    cell.appendChild(text);
    page.appendChild(cell);
    vis.appendChild(cell);
    cell = document.createElement('p');
    text = document.createTextNode("Error Message = " + results.Result_text);
    cell.appendChild(text);
    page.appendChild(cell);
    vis.appendChild(cell);
}
/******* End or error_report() *******/



/************************************************************
 * Function takes the valid web crawl data found in the 'results' JSON object parameter and builds
 * an output table including
 ************************************************************/
function table_build(results){
    $(".form-group-tab").fadeIn("fast");
    $(".cs-loader").hide();
    var page = document.getElementById("table");
    var table = document.createElement("table");
    var x, div, row, cell, text;

    //Clear the table from any previous tables or errors:
    while (page.hasChildNodes()) { page.removeChild(page.lastChild); }

    //Build the results table header:
    cell = document.createElement("caption");
    text = document.createTextNode("Web Crawler Search Results - Data Table");
    cell.appendChild(text);
    table.appendChild(cell);

    //Build the results table headers:
    div = document.createElement("thead");
    row = document.createElement("tr");
    cell = document.createElement("th");
    text = document.createTextNode("Page #");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("URL");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("Page Title");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("Parent ID");
    cell.appendChild(text);
    row.appendChild(cell);
    cell = document.createElement("th");
    text = document.createTextNode("Child IDs");
    cell.appendChild(text);
    row.appendChild(cell);
    div.appendChild(row);
    table.appendChild(div);

    //Build the actual data table:
    div = document.createElement("tbody");
    for (x = 0; x < results.Data.length; x++){
        row = document.createElement("tr");
        cell = document.createElement("td");
        text = document.createTextNode(results.Data[x].ID);
        cell.appendChild(text);
        row.appendChild(cell);
        cell = document.createElement("td");
        text = document.createTextNode(results.Data[x].url);
        cell.appendChild(text);
        row.appendChild(cell);
        cell = document.createElement("td");
        text = document.createTextNode(results.Data[x].title);
        cell.appendChild(text);
        row.appendChild(cell);
        cell = document.createElement("td");
        text = document.createTextNode(results.Data[x].parent);
        cell.appendChild(text);
        row.appendChild(cell);
        cell = document.createElement("td");
        text = document.createTextNode(results.Data[x].child);
        cell.appendChild(text);
        row.appendChild(cell);
        div.appendChild(row);
    }
    table.appendChild(div);

    //Finally add table to page:
    page.appendChild(table);
}
/******* End of table_build() *******/


/************************************************************
 * Function to instantiate tree and call tree methods. Brings
 * in the player controls and table/tree tab control. Handles
 * tree page placement by checking upper contour.
 ************************************************************/
function visualization(results){
    var temp_array = [];
    var temp_title = "";
    var i;//, y, z;
    $("#player").fadeIn("fast");
    $(".form-group-tab").fadeIn("fast");
    $(".cs-loader").hide();
    isCollapsed = $('.collapsedOn:checked').val();

    visTree.loadTreeNodes(results);
    visTree.positionTree();
    visTree.inOrderTree(visTree.nodes[0]);
    visTree.translateHorizontal();

    if (isCollapsed){
        visTree.collapse(visTree.nodes[0]);
        visTree.nodes[0].muted = false;
    }
    //Capture required height/width and assign node locations to new array.
    vis_height = 0;
    vis_width = 0;
    var top = 0;
    var bottom = 0;
    var left = 0;
    var right = 0;
    for (i = 0; i < visTree.nodes.length; i++){
        vis_width = Math.max(vis_width, visTree.orderedNodes[i].x);
        //node_locations[i].push(visTree.nodes[i].x);  //The X coordinate
        vis_height = Math.max(vis_height, visTree.orderedNodes[i].y);
        //node_locations[i].push(visTree.nodes[i].y);  //The Y coordinate
    }
    for (i = 0; i < visTree.nodes.length; i++){
        vis_width = Math.max(vis_width, visTree.orderedNodes[i].x);
        top = Math.max(top, visTree.orderedNodes[i].y);
        bottom = Math.min(bottom,visTree.orderedNodes[i].y);
        right = Math.max(right, visTree.orderedNodes[i].x);
        left = Math.min(left,visTree.orderedNodes[i].x);
    }
    vis_height = top - bottom;
    vis_width = right - left;
    //Add buffer to right/below extreme node position.
    vis_height += 50;
    vis_width += 50;
    if (bottom < 0){
        bottom = bottom * -1;
    }

    //Check to ensure canvas will be at minimum 720px wide, otherwise adjust:
    center_adjust = 0;
    // if (vis_height < 720){
    //     vis_height = 720;
    //     center_adjust = (vis_height / 2) - (visTree.orderedNodes[0].y);
    // }
    var e = document.getElementById("method");
    var opt = e.options[e.selectedIndex].value;
    if (opt == 'BF') {
        for (var j = 0; j < visTree.orderedNodes.length; j++) {
            visTree.orderedNodes[j].x += 350;
            visTree.orderedNodes[j].y += center_adjust + 20 + bottom;
        }
    }
    else  {
        for (var j = 0; j < visTree.orderedNodes.length; j++) {
            visTree.orderedNodes[j].x += 300;
            visTree.orderedNodes[j].y += 75;
        }
    }
    data_avail = true;
    printCounter = 0;

}
/******* End of visualization() *******/




/************************************************************
 * Function is used to prevent users from entering data, and also choosing a History Search.  Only
 * one or the other is allowed, so when the History drop down is used, all other fields become disabled
 * and conversely when history drop down is cleared, the reamining input files are re-enabled.
 ************************************************************/
function lockInput(){
    var cell;
    //Check if change is to a history item, or to blank.  Lock input on history, re-enable on blank.
    cell = document.getElementById("history");
    if(cell.value != "blank"){
        //Clear and disable Starting URL
        cell = document.getElementById("url");
        cell.value = "";
        cell.setAttribute("disabled","disabled");
        //Clear and disable Max Pages
        cell = document.getElementById("max");
        cell.value = "";
        cell.setAttribute("disabled","disabled");
        //Clear and disable Terminate Word/Phrase
        cell = document.getElementById("term");
        cell.value = "";
        cell.setAttribute("disabled","disabled");
        //Clear and disable Method
        cell = document.getElementsByName("method");
        cell[0].checked = false;
        cell[0].disabled = true;
        cell[1].checked = false;
        cell[1].disabled = true;
    }
    else{
        //Re-enable Starting URL
        cell = document.getElementById("url");
        cell.removeAttribute("disabled");
        //Re-enable Max Pages
        cell = document.getElementById("max");
        cell.removeAttribute("disabled");
        //Re-enable Terminate Word/Phrase
        cell = document.getElementById("term");
        cell.removeAttribute("disabled");
        //Re-enable and reset Method
        cell = document.getElementsByName("method");
        cell[0].disabled = false;
        cell[0].checked = true;
        cell[1].disabled = false;
    }
}
/******* End of lockInput() *******/



/************************************************************
 * Function populates the Search History drop down with any historic searches saved to localStorage.
 ************************************************************/
function historyBuild(){
    //Changes only necessary if localStorage is available.
    if (local_avail){
        var section, cell, text;  //Document elements
        var i;  //Loop counter
        var result; //JSON object container from historic search.
        section = document.getElementById("history");

        //Clear the Select:
        while (section.hasChildNodes()) { section.removeChild(section.lastChild); }

        //Generate blank option for new searches.
        cell = document.createElement("option");
        text = document.createTextNode("");
        cell.appendChild(text);
        cell.setAttribute("value", "blank");
        section.appendChild(cell);

        //Add historic searches found in localStorage
        for (i = 0; i < localStorage.length; i++){
            //Due to shared domain www.engr.oregonstat.edu, confirm Omega team storage is used.
            if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
                result = JSON.parse(localStorage.getItem(localStorage.key(i)));
                cell = document.createElement("option");
                //Generate Dropdown option in format "URL; Max:##; <Term:'text'>; Meth:BF|DF"
                var temp_text = result.Data[0].url.split("//")[1] + "; Max:" + result.Requested + "; ";
                if (result.Term_Text != "") { temp_text = temp_text + "Term:'" + result.Term_Text + "'; "; }
                temp_text = temp_text + "Meth:" + result.Method;
                text = document.createTextNode(temp_text);
                cell.appendChild(text);
                cell.setAttribute("value", localStorage.key(i));
                section.appendChild(cell);
            }
        }
    }
}
/******* historyBuild() *******/



/************************************************************
 * Function removes any localStorage items associated with the Omega project.
 ************************************************************/
function clear_history(){
    //Changes only necessary if localStorage is available.
    if (local_avail){
        var i;

        for (i = 0; i < localStorage.length; i++){
            //Only remove localStorage items associated with this project.
            if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
                localStorage.removeItem(localStorage.key(i));
                i--;  //Move counter back one to account for now missing record.
            }
        }
        reset();
    }
}
/******* clear_history() *******/



/************************************************************
 * Onload() function to confirm Browser support for localStorage, set related Global variables,
 * and setup default Search History dropdown based on finding.
 ************************************************************/
window.onload = function() {
    if (typeof(Storage) !== "undefined"){
        var i;

        //Set global variable indiciating browser supports localStorage
        local_avail = true;

        //Considering other projects may be housed on same web.engr.oregonstat.edu, and user may not have
        //cleared localStorage, need to count how many 'Omega' items are stored in local storage.
        for (i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).substring(0,13) == "omega_spr_16_"){
                local_count++;
            }
        }

        //Add Search History items to drop down.
        historyBuild();
    }
    else{
        //If no local storage, note this in Search History dropdown.
        var section, cell, text;
        section = document.getElementById("history");
        cell = document.createElement("option");
        text = document.createTextNode("~~Browser Version/Settings Does Not Support Data Storage~~");
        cell.appendChild(text);
        cell.setAttribute("selected","selected");
        cell.setAttribute("value", "blank");
        section.appendChild(cell);
    }
}
/******* End of onload() function *******/
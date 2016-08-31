var xAdjust = 0;
var yAdjust = 0;
var inner = 0;
var printCounter = 0;


///////////////////////////////////////
//Simple draw() loop playback functions
///////////////////////////////////////

function restartPlay(){
    printCounter = 0;
    loop();
}

function pausePlay(){
    noLoop();
}

function stepFwd(){
    noLoop();
    printCounter++;
    redraw();

}

function startPlay(){
    loop();
    if (printCounter >= visTree.nodes.length){
        printCounter = 0;
        loop();
    }
}

function endPlay(){
    printCounter = visTree.nodes.length;
    loop();
}

///////////////////////////////////////////////
//Functions for mouse-based tree interactivity
//////////////////////////////////////////////

function nodeText(node,overrideText){
    strokeWeight(0);
    //Set dimensions of standard node info box
    node.bWidth = 115;
    node.bHeight = 15;
    if (node.muted == false) {
        //if flag has been set for expanded view on nodeText call
        if (overrideText) {
            fill(255, 255, 255, 255);
            //parent and child info boxes are flipped for readability
            if (node.children.length > 1) {
                node.bWidth = 180;
                node.bHeight = 100;
                node.boxLeft = node.x - 130;
                node.boxTop = node.y - 25;
                node.boxRight = node.boxLeft + node.bWidth;
                node.boxBottom = node.boxTop + node.bHeight;
                rect(node.boxLeft, node.boxTop, node.bWidth, node.bHeight);
            }
            else {
                node.bWidth = 180;
                node.bHeight = 100;
                node.boxLeft = node.x + 15;
                node.boxTop = node.y - 25;
                node.boxRight = node.boxLeft + node.bWidth;
                node.boxBottom = node.boxTop + node.bHeight;
                rect(node.boxLeft, node.boxTop, node.bWidth, node.bHeight);

            }
            fill(54, 184, 227, 255);
            textFont('Courier');
            textSize(10);
            //construct presentation strings conforming to expanded info box dimensions
            var url_one = node.nodeURL.substring(0,29);
            var url_two = node.nodeURL.substring(29,50);
            var disp = "title: " + node.nodeTitle.substring(0, 80);
            disp = disp + '\nURL: ' + url_one + '\n' + url_two + '\ncrawl position: ' + node.id;
            //if node contains termination word, change info box text
            if (node.terminates){
                disp = disp + "\nfound search term: " + termString;
            }
            //rectMode(CORNERS);
            text(disp, node.boxLeft, node.boxTop, node.bWidth, node.bHeight + 40);

        }
        else {
            //or we draw normal-sized info boxes
            fill(255, 255, 255, 190);
            if (node.children.length > 1) {
                node.boxLeft = node.x - 130;
                node.boxTop = node.y - 14;
                node.boxRight = node.boxLeft + node.bWidth;
                node.boxBottom = node.boxTop + node.bHeight;
                rect(node.boxLeft, node.boxTop, node.bWidth, node.bHeight);
            }
            else {
                node.boxLeft = node.x + 15;
                node.boxTop = node.y - 14;
                node.boxRight = node.boxLeft + node.bWidth;
                node.boxBottom = node.boxTop + node.bHeight;
                rect(node.boxLeft, node.boxTop, node.bWidth, node.bHeight);

            }
            textSize(14);
            fill(54, 184, 227, 255);
            textFont('Courier');
            textSize(10);
            var disp = null;
            if (node.terminates){
                disp = "found \"" + termString + "\"";
                fill('orange');
                textStyle(BOLD);
                disp = disp.substring(0,19);
            }
            else {
                disp = node.nodeTitle.substring(0, 19);
            }
            text(disp, node.boxLeft, node.boxTop + 10);
            textStyle(NORMAL);
        }
    }
}

//here we check for active text boxes by checking mouse position against box coordinates
function nodeTextActive(){
    for (var i = 0;i<visTree.orderedNodes.length;i++) {
        if (mouseX > visTree.orderedNodes[i].boxLeft && mouseX < visTree.orderedNodes[i].boxRight) {
            if (mouseY > visTree.orderedNodes[i].boxTop && mouseY < visTree.orderedNodes[i].boxBottom) {
                //sets flag for expanded view
                nodeText(visTree.orderedNodes[i],1);
                return true;
            }
        }
    }
    return false;
}
//same idea, slightly different logic using an TreeNode member flag
function nodeEllipseActive(){
    //console.log(mouseX + ", " + mouseY);
    for (var i = 0;i<visTree.orderedNodes.length;i++) {
        var distFromNode = dist(visTree.orderedNodes[i].x,visTree.orderedNodes[i].y,mouseX,mouseY);
        if (distFromNode < (visTree.config.NODE_SIZE/2)){
            visTree.orderedNodes[i].isActive = true;
            return visTree.orderedNodes[i];
        }
        else{
            visTree.orderedNodes[i].isActive = false;
        }

    }
    return false;
}

function drawNode(node){
    var nodeRadius = visTree.config.NODE_SIZE;
    //console.log("node pos " + node.x + ", " + node.y);
    if (!node.muted) {
        //draw curve using reasonable control points left/right of start/end points
        if (node.parent[0]) {
            stroke(color(0, 0, 0, 125));
            strokeWeight(2);
            noFill();
            curve(node.x + 200,
                node.y,
                node.x,
                node.y,
                node.parent[0].x + 15,
                node.parent[0].y,
                node.parent[0].x - 150,
                node.parent[0].y
            )
        }
        //check for various node states, and color accordingly
        if (node.children.length > 0) {
            node.activeFillColor = node.parentFillColor;
            node.activeStrokeColor = node.parentStrokeColor;
        }
        else {
            node.activeFillColor = node.nonParentFillColor;
            node.activeStrokeColor = node.nonParentStrokeColor;

        }
        if (node.isActive == true && node.children.length > 0) {
            node.activeStrokeColor = '#36B8E3';
            nodeRadius = visTree.config.NODE_SIZE + 5;
        }
        if (node.terminates){
            node.activeFillColor = 'orange';
            node.activeStrokeColor = 'white';
        }
        stroke(node.activeStrokeColor);
        fill(node.activeFillColor);
        strokeWeight(3);
        ellipse(node.x, node.y, nodeRadius, nodeRadius);
        nodeText(node);
        strokeWeight(4);
    }
}


///////////////////////////////////////
//The standard P5.js 'sketch' functions
///////////////////////////////////////


function setup() {
    //noLoop();
}

function draw(){
    var pic = document.getElementById("vis");
    var order = document.getElementById("playback").value;
    //Clear any previous drawings
    if (pic) {
        while (pic.hasChildNodes()) {
            pic.removeChild(pic.lastChild);
        }
        if (data_avail) {
            var treeCanvas = createCanvas(windowWidth * 2, windowHeight * 3);
            background('#5A6569');
            treeCanvas.parent("vis");
            strokeWeight(4);
            if (order=='Search Order') {
                for (var k = 0; k < printCounter; k++) {
                    drawNode(visTree.nodes[k]);
                }
            }
            else{
                for (var k = 0; k < printCounter; k++) {
                    drawNode(visTree.orderedNodes[k]);
                }
            }
            //we set playback speed by modding against P5's built in counter
            if (frameCount % 20 == 0 && printCounter < visTree.orderedNodes.length) {
                printCounter++;
            }
        }
    }
    //check for hovered nodes and info boxes
    nodeTextActive();
    nodeEllipseActive();
}



//check for nodes under mouseclicks, collapse nodes as appropriate
function mousePressed(){
    if(nodeEllipseActive()){
        if(nodeEllipseActive().collapsed == false){
            visTree.collapse(nodeEllipseActive());
            nodeEllipseActive().muted = false;
            nodeEllipseActive().collapsed = true;
        }
        else{
            visTree.uncollapse(nodeEllipseActive());
            nodeEllipseActive().collapsed = false;
        }
    }
}

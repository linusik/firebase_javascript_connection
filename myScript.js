// get product name from URL
var product_name = window.location.search.substring(1);

// Get a reference to the root of the Database
var playersRef = firebase.database().ref(product_name + "/player");
var priceRef   = firebase.database().ref(product_name + "/price");
var winnerRef  = firebase.database().ref(product_name + "/winner");
var coverRef   = firebase.database().ref(product_name + "/cover");
var balanceRef = firebase.database().ref("balance");

//global variable
var complete_bids = 0;


// ----Drag and Drop----->
window.allowDrop = function(event) {
    event.preventDefault();
    if ( event.target.className == "div" ) {
        document.getElementById("box1").innerHTML = "Excellent choice!";
        event.target.style.border = "1px solid red";
    }
}

window.dragLeave = function(event) {
    if ( event.target.className == "div" ) {
        document.getElementById("box1").innerHTML = "Drop inside the box!";
        event.target.style.border = "";
    }
}

// -----use a card to make a bid----->
window.drag = function(event) {
    event.dataTransfer.setData("image", event.target.id);
    
    // calculate all money user has for purchases
    firebase.auth().onAuthStateChanged(function(user) {
        // User is signed in
        if (user) {
    balanceRef.once("value", function(snap) {
    var sum = 0.0;
    snap.forEach(function (childSnap) {
       if (childSnap.val().userId == firebase.auth().currentUser.uid){
            sum = parseFloat(childSnap.val().amount) + sum;
        }
    });
    // check if user has enought money for a bid (total is 10 cells)
    priceRef.once("value", function(snapPrice) {
    var price = (snapPrice.val().amount)/10;
        if (sum < price){
         swal(
                'Oops...',
                'Please add balance',
                'error'
            )
        }
    });
});
        // No user is signed in
        } else {
            swal(
                'Oops...',
                'Please login to place bids and see who is playing!',
                'error'
        )}
    });   
}

// -----drop a card to a cell----->
window.drop = function(event) {
    //get data from function event to insert in chosen cell
    event.preventDefault();
    var data = event.dataTransfer.getData("image");
    var ele = document..getElementById(data);  
    var div = event.target;
    event.target.style.border = "";

    // ----check if a cell is available---->
    if ( div.nodeName !== "IMG" ) {
    div.appendChild(ele);
    } else {
        box1.innerHTML = "This one is taken!!!";
        return;
    }
    ajax_post(ele,div);
    //----Update balance of current user to Firebase after the user chose a cell----->
    priceRef.once("value", function(snapPrice) {
        var price = (snapPrice.val().amount)/10;
        var sum = 0.0;
        balanceRef.once("value", function(snap) {
            var new_balance = 0.0;
            var subtracted = false; 
            //go through all user balance
            snap.forEach(function (childSnap) {
                if (childSnap.val().userId == firebase.auth().currentUser.uid){
                    if ((sum != price) && (subtracted == false)){
                        //summarize all amount that less than necessary amoumt, and delete row from firebase
                        if ((childSnap.val().amount <= price) && (childSnap.val().amount <= (price - sum))){
                            sum += childSnap.val().amount;
                            firebase.database().ref("balance/" + childSnap.key).set(null);
                        }
                        //there is required amount
                        else{
                            new_balance = parseFloat(childSnap.val().amount) - (price - sum);
                            sum  = price;
                            //update user's amount to firebase
                            firebase.database().ref("balance/" + childSnap.key).update({amount: new_balance});
                            subtracted = true;
                        }
                    }
                }
            });
              
        });
    });
// ----last bid made to trigger the Random Pick---->
    if (complete_bids == 10){
        countDown(5,'box1');
        event.target.style.animation = "pusate .5s infinite alternate";
    } else {
        event.target.style.animation = "pusate .5s infinite alternate";
        box1.innerHTML = "Place more bids!";
    }
}
firebase.auth().onAuthStateChanged(authData => {

// ----AJAX Post----->
window.ajax_post = function(ele,div){
// ----Post to Firebase----->
var block = playersRef.push();
block.set({
    imgName: "bid.png",
    userBid: "dollar.png",
    imgClass: "player",
    imgId: (ele.id),
    divId: (div.id),
    userId: (authData.uid)
    });
}

// ----load older bids as well as any newly added one-->
playersRef.on("child_added", function(snap) {
    var divId = snap.val().divId;
    var userId = snap.val().userId;
    //check if all cells are busy
    winnerRef.once("value", function(snapshot){
        if (complete_bids == 10 && snapshot.val().refresh_page == "true"){
            var wineer_divId = snapshot.val().divId;
            if (wineer_divId == divId){
                document.getElementById(divId).style.background = "#90dda7";
            }
            //determine a winner
            winnerFunc();   
        }
    });
    //show the winner to the user 
    if (userId == authData.uid) {//winner
        document.getElementById(divId).innerHTML += contactHtmlFromObjectDollar(snap.val());
    }
    else {
        document.getElementById(divId).innerHTML += contactHtmlFromObjectBid(snap.val());
        }
    });
    
});

// ----last bid to trigger Random Pick---->
playersRef.on("value", function (snap){
    complete_bids = 0;
    snap.forEach(function (childSnap) {
       complete_bids++;
    });
    if (complete_bids <=9 )
        firebase.database().ref(product_name + "/winner/refresh_page").set("");
});


// ----prepare player object's HTML---->
function contactHtmlFromObjectDollar(player){
  //console.log(player);
  var box = '';
        box += '<img src="img/' + player.userBid + '" class="player" />';
  return box;
}
function contactHtmlFromObjectBid(player){
  //console.log(player);
  var box = '';
        box += '<img src="img/' + player.imgName + '" class="player" alt="' + player.imgId + '"/>';
  return box;
}

// ----Timer---->
function countDown(secs,elem) {
    for (var i = 0; i<10; i++){
        var x = document.querySelectorAll(".div");
        x[i].style.animation = "pusate .5s infinite alternate";
    }
    document.getElementById("cover").innerHTML = '<img src="img/random.gif" draggable="false"/>';
    var element = document.getElementById(elem);
    //element.innerHTML = "Please wait for "+secondsToHms(secs)+" sec ...";
    secs--;
    var timer = setTimeout('countDown('+secs+',"'+elem+'")',1000);
    
    if (secs < 1) {
        clearTimeout(timer);
        randomPhrase();
        for (var i = 0; i<10; i++){
            var x = document.querySelectorAll(".div");
            x[i].style.animation = "";
        }
    }


//-----Check which player won---->
function winnerFunc(){
    var user = firebase.auth().currentUser;
    var userId, divId;
    if (complete_bids == 10){
    winnerRef.once("value", function (snap){
        if (snap.val().userId == user.uid){
            document.getElementById("cover").innerHTML = '<img src="img/won.gif" draggable="false"/>';
            //box1.innerHTML = "You Won!!!";
        } else {
            document.getElementById("cover").innerHTML = '<img src="img/lose.gif" draggable="false"/>';
            //box1.innerHTML = "You Lose!!!";
        } 
    });    }
}

// ----Random Pick------>
function randomPhrase() {
    var user = firebase.auth().currentUser;
    var ids = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    var divs = document.getElementsByClassName("div");
    var item = document.getElementsByClassName("item-1");
    var userId = '';
    //go through array and randomly choose a winner
    while (divs.length > 0) {
        var i = Math.floor(Math.random() * ids.length);
        divs[0].classList.add('item-' + ids[i]);
        ids.splice(i, 1);
        divs = [].slice.call(divs, 1);
    }
    item = document.getElementsByClassName("item-1");
    var divId = item[0].id; 
    firebase.database().ref(product_name + "/winner/divId").set(divId);
    playersRef.once("value", function(snap) {
        snap.forEach(function (childSnap) {
            if (String(childSnap.val().divId) == divId){
                userId =  userId + String(childSnap.val().userId);
            }
        });
    });
    firebase.database().ref(product_name + "/winner/userId").set(userId);
    var updates = {};
    updates[product_name + "/winner/refresh_page"] = "true"
    firebase.database().ref().update(updates);
    winnerFunc();
}

// ----Sum Payments from Firebase--->
balanceRef.on("value", function(snap) {
    var sum = 0.0;
    snap.forEach(function (childSnap) {
       if (childSnap.val().userId == firebase.auth().currentUser.uid){
            sum = parseFloat(childSnap.val().amount) + sum;
        }
    });
    document.getElementById("balance").innerHTML = "Balance: $" + sum.toFixed(2);
}); 

// ----Price for game Firebase--->
priceRef.once("value", function(snap) {
    var price = snap.val();
    document.getElementById("total_price").innerHTML = "Total Price $" + price.amount;
});

// ----Cover Image--->
coverRef.once("value", function(snap) {
    if (complete_bids < 10){
    var cover = snap.val();
    document.getElementById("cover").innerHTML = '<img src="img/' + cover.img + '" draggable="false"/>';
    }
});

// ----Log Out------>
function logout() {
    firebase.auth().signOut().then(function() {
        console.log('Signed Out');
    }, function(error) {
        console.error('Sign Out Error', error);
    });
}
// get product name from URL
var url = window.location.search.substring(1);
var products =  url.split("_");
var product_name = products.pop();
var category = (product_name.split("-").pop());
var product_status;
if (products.length == 0){
    product_status= "active";
}else{
    product_status = products.join("_");
}
//hide();

// Get a reference to the root of the Database
var playersRef = firebase.database().ref(category + "/" + product_name + "/" + product_status + "/players");
var productRef   = firebase.database().ref(category + "/" + product_name + "/" + product_status);
var database = firebase.database();

var complete_bids = 0;
var players = 0;

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

window.drag = function(event) {
    event.dataTransfer.setData("image", event.target.id);
// check balance to allow user bid
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) { //if a user signed in, check user's balance
            var balance = 0.0;
            database.ref('users/' + user.uid).once("value", function(snap) {
                balance =  parseFloat(snap.val().balance);
                productRef.once("value", function(snapPrice) {
                    if (balance < ((snapPrice.val().price)/10)){//compare balance with cost of bid
                        swal(
                            'Oops...',
                            'Please add balance',
                            'error')
                    }
                });
            });
        // User is signed in.
        } else {
        // No user is signed in.
            swal(
                'Oops...',
                'Please login to place bids and see who is playing!',
                'error'
        )}
    });   
}

window.drop = function(event) {
    if(navigator.onLine == true){
        event.preventDefault();
        var data = event.dataTransfer.getData("image");
        var ele = document.getElementById(data);  
        var div = event.target;
        event.target.style.border = "";
        //console.log(div.nodeName);

        if ( div.nodeName !== "IMG" ) {
        document.getElementById("coin_drop").play();
        div.appendChild(ele);
        } else {
            document.getElementById("incorrect_alert").play();
            box1.innerHTML = "This one is taken!!!";
            return;
        }
        ajax_post(ele,div);
        //----Update balance of current user to Firebase----->
        firebase.auth().onAuthStateChanged((user) => {
            if (user){
                productRef.once("value", function(snapPrice) {
                    //try{
                        var bids = snapPrice.val().amount_bids + 1;

                        productRef.update({amount_bids: bids});
                   // }catch(e){}
                    database.ref('users/' + user.uid).once("value", function (snap){
                        var new_balance = parseFloat(snap.val().balance) - parseFloat((snapPrice.val().price)/10);
                        var updateCurrentBids = snap.val().current_bids;
                        if (updateCurrentBids == null){
                            database.ref('users/' + user.uid).update({ balance: new_balance, current_bids: [product_name]});
                        }
                        else{
                            updateCurrentBids.push(product_name);
                            updateCurrentBids = updateCurrentBids.filter( function (item, index, inputArray){
                                return inputArray.indexOf(item) == index;
                            });
                            database.ref('users/' + user.uid).update({ balance: new_balance, current_bids: updateCurrentBids});
                        }

                    });
                });

            }
        });
    // ----last bid made to trigger the Random Pick---->
        //lastBid();
        if (complete_bids == 10){
            countDown(5,'box1');
            event.target.style.animation = "pusate .5s infinite alternate";
        } else {
            event.target.style.animation = "pusate .5s infinite alternate";
            box1.innerHTML = "Place more bids!";
        }
    }else{
         swal(
                'Oops...',
                'Please, check your internet connection!',
                'error'
    )}
}


firebase.auth().onAuthStateChanged((user) => {
    
// ----PopUp warning if not loged in------>
    var delay = setTimeout(myTimer, 3000);
    function myTimer() {
        if (user) {
    // User is signed in.
        } else {
    // No user is signed in.
        swal(
            'Oops...',
            'Please login to place bids and see who is playing!',
            'error'
        )}
    }
    if (user){
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
                userId: (user.uid)
            });
        }
        // ----load older bids as well as any newly added one...-->
        playersRef.on("child_added", function(snap) {
            complete_bids++;
            var divId = snap.val().divId;
            var userId = snap.val().userId;
            if(complete_bids == 10){
                database.ref(category + "/" + product_name + "/" + product_status + "/winner").once("value", function(snapshot){
    // ----last bid to trigger Random Pick---->
                    if ((snapshot.val() != null) && (snapshot.val().refresh_page == "true")){
                        document.getElementById(snapshot.val().divId).style.background = "#90dda7";
                    }
                });
            }
            if (userId == user.uid) {
                players++;
                document.getElementById(divId).innerHTML += contactHtmlFromObjectDollar(snap.val());
            }else {
                document.getElementById(divId).innerHTML += contactHtmlFromObjectBid(snap.val());
            }
        });
        //constantly check if user added money and refresh user's balance
        database.ref('users/' + user.uid).on("value", function (snap){
            if (snap.val() == null){
                database.ref('users/' + user.uid).update({ balance: 0, added_balance: 0});
            }
            var new_balance = parseFloat(snap.val().balance) + parseFloat(snap.val().added_balance);
            document.getElementById("balance").innerHTML = "Balance: $" + new_balance.toFixed(2);
            database.ref('users/' + user.uid).update({ balance: new_balance, added_balance: 0});
        });
        
        //constantly check is product is ended and refresh page
        database.ref(category + "/" + product_name).limitToLast(1).on('child_changed', function(snap){
            database.ref(category + "/" + product_name).limitToLast(5).once('child_added', function(s){
                var date_time = s.key;
                endedGameResults(date_time + "_" + product_name);
            });
        });
    }
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
}

//-----Check which player won---->
function winnerFunc(){
    if ((complete_bids == 10) && (players > 0)){
        firebase.auth().onAuthStateChanged((user) => {
            if (user){
                database.ref(category + "/" + product_name + "/" + product_status + "/winner").once("value", function (snap){
                    if (snap.val().userId == user.uid){
                        document.getElementById("cover").innerHTML = '<img src="img/won.gif" draggable="false"/>';
            //box1.innerHTML = "You Won!!!";
                    } else {
                        document.getElementById("cover").innerHTML = '<img src="img/lost.png" draggable="false"/>';
            //box1.innerHTML = "You Lose!!!";
                    }
                });
            }
        });
    }
    else{
      productRef.once("value", function(snap) {
          document.getElementById("cover").innerHTML = '<img src="img/' + snap.val().cover_img + '" draggable="false"/>';
      });
    }
}






// ----Random Pick------>
function randomPhrase() {
    var user = firebase.auth().currentUser;
    var ids = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    var divs = document.getElementsByClassName("div");
    var item = document.getElementsByClassName("item-1");
    var userId ;
    var ended_product;
    var updateProduct;
    var currentBids;
    var updates = {};
    var players = [];
    var divId;
    while (divs.length > 0) {
        var i = Math.floor(Math.random() * ids.length);
        divs[0].classList.add('item-' + ids[i]);
        ids.splice(i, 1);
        divs = [].slice.call(divs, 1);
    }
    item = document.getElementsByClassName("item-1");
    divId = item[0].id; 
    
    
    database.ref(category + "/" + product_name + "/" + product_status + "/winner/divId").set(divId);
    playersRef.once("value", function(snap) {
        snap.forEach(function (childSnap) {
            players.push(childSnap.val().userId);
            if (String(childSnap.val().divId) == divId){
                userId =  String(childSnap.val().userId);
            }
        });
    });
    
    database.ref(category + "/" + product_name + "/" + product_status + "/winner/userId").set(userId);
    updates[category + "/" + product_name + "/" + product_status + "/winner/refresh_page"] = "true"
    firebase.database().ref().update(updates);
    
    
    ended_product = dateFormat();
    transferProductInfo(ended_product); //Create new ended product and reset active
    
    //product to add to won/lost array, and shipping table
    ended_product = ended_product + "_" + product_name;
    
    // delete all repeated players in a game
    players = players.filter( function (item, index, inputArray){
        return inputArray.indexOf(item) == index;
    });
    
    database.ref(category + "/" + product_name).once("value", function(snap){
        //refresh stock
        var new_stock = (snap.val().stock - 1) + snap.val().add_to_stock;
        if (new_stock != 0){
            database.ref(category + "/" + product_name).update({stock: new_stock, add_to_stock: 0});
        }
        //refresh price
        database.ref(category + "/" + product_name + "/active").update({price:  snap.val().new_price});
    });
    
    // update won and lost products for each user participating in bids
    console.log(players);
    for (var i = 0; i < players.length; i++){
        console.log("player: ", players[i], ", userId: ", userId);
        won_lost(players[i], userId, updateProduct, ended_product, currentBids);
    }   
    //winnerFunc();
}


function won_lost(player, userId, updateProduct, ended_product, currentBids){
         database.ref('users/' + player).once("value", function (snap){
            if (player == userId){ //user who won product
                updateProduct = snap.val().won_products;
                if (updateProduct == null){
                    database.ref('users/' + player).update({won_products: [ended_product]});
                }
                else{
                    updateProduct.push(ended_product);
                    database.ref('users/' + player).update({won_products: updateProduct});
                }
            // add to shipping table won product information
                database.ref("shipping/" + ended_product).set({ship_label: "", status: "not paid", userId: userId});
            }else{// all users who lost the game
                updateProduct = snap.val().lost_products;
                if (updateProduct == null){
                    database.ref('users/' + player).update({lost_products: [ended_product]});
                }
                else{
                    updateProduct.push(ended_product);
                    database.ref('users/' + player).update({lost_products: updateProduct});
                }
            }
            //delete product from current bids if it's ended
            currentBids = snap.val().current_bids;
            if (currentBids != null){
                console.log(product_name);
                currentBids = currentBids.filter( function (item) {
                    return item != product_name;
                });
                database.ref('users/' + player).update({current_bids: currentBids});
            }
        });   
    
    
}

// ----Upload Price and cover image for game Firebase--->
productRef.once("value", function(snap) {
    document.getElementById("total_price").innerHTML = "One Credit = $" + ((snap.val().price)/10).toFixed(2);
    //lastBid();
    if (complete_bids < 10){
        document.getElementById("cover").innerHTML = '<img src="img/' + snap.val().cover_img + '" draggable="false"/>';
    }
    else{
        winnerFunc();
    }
});

//fill value to the left with "0"
function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

//get and format date and time
function dateFormat(){
    var now = new Date();
    var strDateTime = [[now.getUTCFullYear(),
        AddZero(now.getUTCMonth() + 1), 
        AddZero(now.getUTCDate())].join("_"), 
        [AddZero(now.getUTCHours()), 
        AddZero(now.getUTCMinutes())].join(":")].join("_");
    return strDateTime;
}


//add ended product to separate folder and refresh te same active product
function transferProductInfo(ended_product){
     productRef.once("value", function(snap){
       
       //save ended product data from product_status product
       database.ref(category + "/" + product_name + "/" + ended_product).set(snap.val());
        
       //change product_status 
       productRef.update({amount_bids: 0, players: null, winner: null});
    });      
}

//redirect user to new results-webpage
function endedGameResults(ended_product){
    window.location.href="http://localhost:8080/myalias/Random-Winner/front/ground.html?" + ended_product;
    
    //window.location.href="https://www.fastnwise.com/ground.html?" + ended_product;
}

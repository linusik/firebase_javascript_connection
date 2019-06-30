var database = firebase.database();
document.getElementById("save").onclick = addProfileInfo;
document.getElementById("update").onclick = profileInfoFromDB;

function addProfileInfo(){
    database.ref('users/' + firebase.auth().currentUser.uid).update({
        name: document.getElementById("name").value,
        address1: document.getElementById("address1").value,
        address2: document.getElementById("address2").value,
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        postcode: document.getElementById("postcode").value,
        country: document.getElementById("country").value
    });
}

function profileInfoFromDB(){
     database.ref('users/' + firebase.auth().currentUser.uid).once("value", function(snap){
         document.getElementById("name").value = snap.val().name;
         document.getElementById("address1").value = snap.val().address1;
         document.getElementById("address2").value = snap.val().address2;
         document.getElementById("city").value = snap.val().city;
         document.getElementById("state").value = snap.val().state;
         document.getElementById("postcode").value = snap.val().postcode;
         document.getElementById("country").value = snap.val().country;
     });
}

firebase.auth().onAuthStateChanged((user) => {
    if (user){
        database.ref('users/' + user.uid).once("value", function(snap) {
        
        //show user's personal information
            document.getElementById("profile-name").innerHTML = snap.val().name;
            document.getElementById("profile-address1").innerHTML = snap.val().address1;
            document.getElementById("profile-city").innerHTML = snap.val().city + ", " + snap.val().state + " " + snap.val().postcode;
            document.getElementById("profile-country").innerHTML = snap.val().country;
            
        //pull out all current bids, won and last games user has 
            pullUpGames(document.getElementById("menu1"), snap.val().current_bids, 'tablebody_current');
            pullUpGames(document.getElementById("menu2"), snap.val().won_products, 'tablebody_won');
            pullUpGames(document.getElementById("menu3"), snap.val().lost_products, 'tablebody_lost');

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
    }
});

function pullUpGames(parenttbl, game_bids, tablebody){
    try{
        var t = document.getElementById(tablebody);
        var openCells, gameType, product_name, c, r, a, p = 0;
        for(var i = (game_bids.length -1); i >= 0; i--){
            r = t.insertRow((game_bids.length - 1) - i); // new row for each product
        //picture, link for all tabs 
            c = r.insertCell(0);
            a = document.createElement('a');
            a.innerHTML =  '<img src=\'' + 'img/' + ((game_bids[i]).split("_")).pop() + '.jpg\'>';
            a.setAttribute('href', "http://localhost:8080/myalias/Random-Winner/front/ground.html?" + (game_bids[i] || 0));
            c.appendChild(a);
        //Current Bids Tab
            if (tablebody == 'tablebody_current'){
                var gameType = game_bids[i].split("-").pop();
                getCells(i, r, game_bids[i], gameType); //open cells
                getWinningPercentage(r, game_bids[i], gameType);//chance of winning
            }
        //Won Games
            else if(tablebody == 'tablebody_won'){
                dateInfo(r, game_bids[i]); //recieve date information for won product
                shippingStatus(r, game_bids[i]);
            }
        //Lost games
            else{
                //recieve date information for lost product
                dateInfo(r, game_bids[i]);
            }
        }
        parenttbl.appendChild(t);
    }
    catch(e){}
}


//get open cells from database and add to current bids tab
function getCells(i, r, product_name, gameType){
    var c = r.insertCell(1);
    var p = document.createElement('p');
    var bidsRef = database.ref(gameType + "/" + product_name + "/active");
    bidsRef.once("value", function (snap){
        var openCells = 10 - snap.val().amount_bids;
        p.innerHTML = openCells;
        c.appendChild(p);
    });
}

//get amount of user's bids, and calculate percentage of winning 
function getWinningPercentage(r, product_name, gameType){
    var c = r.insertCell(2);
    var p = document.createElement('p');
    var playersRef = database.ref(gameType + "/" + product_name + "/active/players");
    playersRef.once("value", function (snap) {
        var percentage = 0;
        snap.forEach(function (childSnap){
            if(childSnap.val().userId == firebase.auth().currentUser.uid){
                percentage++;
            }
        });
        percentage = percentage*10;
        p.innerHTML = percentage + '%';
        c.appendChild(p);
    });
}

//shipping status related actions, including button to pay for label
function shippingStatus(r, product){
    database.ref("shipping/" + product).once("value", function(snap){
        var c = r.insertCell(2);
       // c.style.minWidth = '500px';
        var p = document.createElement("p");
        p.innerHTML = "Paid &#x2705";
        p.style.visibility = 'hidden';
        if (snap.val().status == "not paid"){
            var button = document.createElement("button");
            button.innerHTML = "Pay shipping cost";
            //Add event handler
            button.addEventListener("click", function() {           
                //validate shipping address and check if user has money to pay for SHIPPING
                database.ref("users/" + firebase.auth().currentUser.uid).once("value", function(snap){
                    if ((snap.val().address1 == "") || (snap.val().city == "") || (snap.val().country == "") || (snap.val().name == "") || (snap.val().postcode == "") || (snap.val().state == "")){
                        swal(
                            'Oops...',
                            'Please add shipping address',
                            'error')
                    }
                    else{
                        var balance =  parseFloat(snap.val().balance);
                        if (balance < 3.00){//compare balance with cost of shipping
                            swal(
                                'Oops...',
                                'Please add balance',
                                'error')
                        }else{
                            balance -= 3;
                            database.ref("users/" + firebase.auth().currentUser.uid).update({balance: balance});
                            database.ref("shipping/" + product).update({status: "paid"});
                            p.style.visibility = 'visible';
                            button.style.visibility = 'hidden';
                            c.appendChild(p);
                        }
                    }
                });
            });
            c.appendChild(button);
        }else{
            p.style.visibility = 'visible';
            c.appendChild(p);
        }
    });
}

//date information
function dateInfo(r, ended_product){
    var c = r.insertCell(1);
    var p = document.createElement('p');
    ended_product = ended_product.split("_");
    ended_product.pop(); // product name
    ended_product.pop(); // time
    ended_product.push(ended_product.shift());
    p.innerHTML = ended_product.join("/");// mm/dd/year
    c.appendChild(p);
}


// get product name from URL
var url = window.location.pathname.split("/").pop();
var products;
if (url == "index.html"){
    products = ["the-division-ps4", "dying-light-ps4", "madden-nfl-15-ps4", "the-last-of-us-ps4", "tomb-raider-ps4", "batman-arkham-knight-ps4", "NBA-2K17-ps3", "deadpool-ps3", "fallout-new-vegas-ultimate-ps3", "gran-turismo-6-ps3", "grand-theft-auto-V-ps3", "rage-ps3"]; 
}
else if (url == "ps3.html") {
    products = ["rage-ps3", "gran-turismo-6-ps3", "fallout-new-vegas-ultimate-ps3", "grand-theft-auto-V-ps3", "deadpool-ps3", "NBA-2K17-ps3"]; 
}
else if (url == "xbox1.html") {
    products = ["battlefield-4-xbox1", "destiny-xbox1", "call-of-duty-ghosts-xbox1", "watch-dogs-xbox1", "the-elder-scrolls-online-xbox1", "batman-arkham-knight-xbox1"]
}
else if (url == "xbox360.html") {
    products = ["assassins-creed-rogue-limited-xbox360", "injustice-gods-among-us-ultimate-xbox360", "watch-dogs-xbox360", "the-elder-scrolls-online-xbox360", "call-of-duty-ghosts-xbox360", "assassins-creed-IV-black-flag-xbox360"]
}
else{
    products = [];
}
var total_pages = products.length/6;
var database = firebase.database();

function changeContent(page){
    for (var a, img, div_img, div_name, product, product_arr, gameType, picture, split, i = 0; i < 6; i++){
        product = products[i + page*6];  
        product_arr = product.split('-').slice(0, -1);
        picture = product_arr.join('-') + ".jpg";
        img = document.createElement('img');
        img.src = "img/" + picture;
        div_img = document.getElementById("img"+ (i+1));
        div_img.innerHTML = "";
        div_img.appendChild(img);
        div_name = document.getElementById("thumbnail" + (i+1));
        a = document.createElement('a');
        a.href = "ground.html?" + product;
        a.innerHTML = formatProductName(product_arr);
        div_name.innerHTML = "";
        div_name.appendChild(a);
        gameType = product.split("-").pop();
        getPrice(product, gameType, i+1);
    }
}

function formatProductName(product_arr){
    var name = capitalizeFirstLetter(product_arr[0]);
    var count = product_arr[0].length;
    for(var count, i = 1; i < product_arr.length; i++){
        product_arr[i] = capitalizeFirstLetter(product_arr[i]);
        count += product_arr[i].length;
        if(count <= 13){
            name += " " + product_arr[i];
        }
        else{
            name += '<br>' + product_arr[i];
            count = product_arr[i].length;
        }
    }
    return name;
}

function getPrice(product, gameType, num){
    var stockRef = database.ref(gameType + "/" + product);
    var productRef = database.ref(gameType + "/" + product + "/active");
    stockRef.once("value", function(snap){
        productRef.once("value", function(snappro) {
            //check add_to_stock 
            if(snap.val().add_to_stock > 0){
                stockRef.update({stock:(snap.val().stock + snap.val().add_to_stock), add_to_stock: 0 });
            }
            var game = "game" + num;
            document.getElementById(game).innerHTML = "$" + (parseFloat(snappro.val().price)/10).toFixed(2);
            var cells = document.getElementById("cells" + num);
            if (snap.val().stock < 1){
                var not_allowed = document.getElementById("thumbnail" + num);
                not_allowed.style.cursor = "not-allowed";
                not_allowed.removeAttribute('href');
                not_allowed.style.textDecoration = "none";
                cells.style.color = "#d17581";
                cells.innerHTML = "OUT OF STOCK";
            }else{
                cells.innerHTML = "Open Cells: " + (10 - snappro.val().amount_bids);
            }
        });
    });
}

function capitalizeFirstLetter(product) {
    return (product.charAt(0).toUpperCase() + product.slice(1));
}


    $(function () {
        window.pagObj = $('#pagination').twbsPagination({
            totalPages: total_pages,
            visiblePages: 5,
            onPageClick: function (event, page) {
                changeContent(page - 1);
                console.info(page + ' (from options)');
                //$('.caption #p1').text('Page ' + page);
            }
        }).on('page', function (event, page) {
            console.info(page + ' (from event listening)');
        });
    });

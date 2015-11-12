//Caman.DEBUG = ('console' in window);

//
//Image de grande taille tronqué avec webgl sur chromium, fonctionnel sur firefox
//Erreur: out of range
//

var image_base = new Image();
var image_modif = new Image();//taille réel (pour save/upload)
var image_affiche = new Image();//petite taille préview (pour traitement CamanJS)
var canvas_traitement = document.createElement('canvas');//pour effectuer les traitements de filtre
var filtre_utilise = null;
var ratio_image;
$.fn.cropper;
        var canvas_glfx = null;
	var texture = null;
image_affiche.id = "image";
image_affiche.className = "img-responsive center-block";
image_base.className = "img-responsive center-block"; 
image_base.crossOrigin="Anonymous";
image_affiche.crossOrigin="Anonymous";
image_modif.crossOrigin="Anonymous";

var image_position = {	'screen':{'left':0,'top':0},
			'modal':{'left':0,'top':0}	} ;

var devices_glfx_flip = [
	'iPad Simulator',
	'iPhone Simulator',
	'iPod Simulator',
	'iPad',
	'iPhone',
	'iPod' ];

var filtres = [//	"normal",
	"vintage",
	"lomo",
	"clarity",
	"sinCity",
	"sunrise",
	"crossProcess",
	"orangePeel",
	"love",
	"grungy",
	"jarques",
	"pinhole",
	"oldBoot",
	"glowingSun",
	"hazyDays",
	"herMajesty",
	"nostalgia",
	"hemingway",
	"concentrate" ];

this.onload = function(){
	// Try to get a WebGL canvas
	if (!window.fx) {
		$('#image_zone').html('glfx.js n\'a pas chargé.');
		alert('glfx.js n\'a pas chargé.');
		return;
	}
	try {
		canvas_glfx = fx.canvas();
	} catch (e) {
		$('#image_zone').html('Désolé, ce navigateur ne suporte pas WebGL');
		alert('Désolé, ce navigateur ne suporte pas WebGL');
		return;
	}
	$('#validation').hide();
};


function image_request(demande){

        //$('#filtre button').removeClass('disabled');
        //$('#filtre #normal').addClass('disabled');

        $('#famille li').removeClass("active");
        $('.tab-content div').removeClass("active");

	/*delete image_base, image_modif, image_affiche; //pour eviter de garder une ancienne image traité
*/	$('#loading_circle').show();
	$('#image_url').empty();
	$('#image_url').append('<div> demande:'+demande+'</div>');
	$('#image_zone').empty();
	$.ajax({
                type: 'GET',
                url: 'test.txt',
		cachngse: false,
                success: function(msg){
			load_image(msg);
                }
	});
}

function resizeCanvasImage(img, canvas, maxWidth, maxHeight) {
    var imgWidth = img.width, 
        imgHeight = img.height;

    var ratio = 1, ratio1 = 1, ratio2 = 1;
    ratio1 = maxWidth / imgWidth;
    ratio2 = maxHeight / imgHeight;


    // Use the smallest ratio that the image best fit into the maxWidth x maxHeight box.
    if (ratio1 < ratio2) {
        ratio = ratio1;
    }
    else {
        ratio = ratio2;
    }

    if (ratio > 1){
	ratio = 1;
    }

    var canvasContext = canvas.getContext("2d");
    var canvasCopy = document.createElement("canvas");
    var copyContext = canvasCopy.getContext("2d");
    var canvasCopy2 = document.createElement("canvas");
    var copyContext2 = canvasCopy2.getContext("2d");
    canvasCopy.width = imgWidth;
    canvasCopy.height = imgHeight;  
    copyContext.drawImage(img, 0, 0);

    // init
    canvasCopy2.width = imgWidth;
    canvasCopy2.height = imgHeight;        
    copyContext2.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvasCopy2.width, canvasCopy2.height);


    var rounds = 2;
    var roundRatio = ratio * rounds;
    for (var i = 1; i <= rounds; i++) {
      //  //console.log("Step: "+i);

        // tmp
        canvasCopy.width = imgWidth * roundRatio / i;
        canvasCopy.height = imgHeight * roundRatio / i;

        copyContext.drawImage(canvasCopy2, 0, 0, canvasCopy2.width, canvasCopy2.height, 0, 0, canvasCopy.width, canvasCopy.height);

        // copy back
        canvasCopy2.width = imgWidth * roundRatio / i;
        canvasCopy2.height = imgHeight * roundRatio / i;
        copyContext2.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvasCopy2.width, canvasCopy2.height);

    } // end for


    // copy back to canvas
    canvas.width = imgWidth * roundRatio / rounds;
    canvas.height = imgHeight * roundRatio / rounds;
    canvasContext.drawImage(canvasCopy2, 0, 0, canvasCopy2.width, canvasCopy2.height, 0, 0, canvas.width, canvas.height);

	$(canvasCopy).remove();
	$(canvasCopy2).remove();
	return ratio;
}

function load_image(url){
	if(canvas_glfx == null) return;
        $('#famille li').removeClass("active");
        $('.tab-content div').removeClass("active");
	$('#loading_circle').show();
	$('#image_url').empty();
	$('#image_zone').empty();
	image_affiche.onload = function () { //premier chargement de l'image affichée
		$('#image_zone').empty().append(image_affiche);
		$('#loading_circle').hide();
		image_affiche.onload = null;
		reset();
	};

	image_modif.onload = function(){

		ratio_image = resizeCanvasImage(image_modif, canvas_traitement, 550,550);
		image_affiche.src = canvas_traitement.toDataURL("image/jpeg");

		canvas_glfx.height = canvas_traitement.height;
		canvas_glfx.width = canvas_traitement.width;
		texture = canvas_glfx.texture(canvas_traitement);

		$('#save').attr({download:"image.jpeg",target: '_blank',href  : image_modif.src });
		//image_modif.onload = null;
	};

	image_base.src = url; //"image/unnamed3.jpg";
	image_modif.src = url;
	$('#image_url').empty().text('url charge:'+url);

	
	var erreur = function () {
		$('#image_url').empty().html('<p class="text-center">That image is not available('+url+').</p>');
	}
	image_base.error = erreur;
	image_affiche.error = erreur;

	$('#image_zone').empty().html('<p class="text-center">Loading...</p>');
}

function affiche_base(){
	$('#loading_circle').show();
	var canvas_base = document.createElement('canvas');
	resizeCanvasImage(image_base, canvas_base, 550, 550);
	image_affiche.src = canvas_base.toDataURL("image/jpeg");	
	setTimeout(function(){
		image_affiche.src = canvas_traitement.toDataURL("image/jpeg");
		$('#loading_circle').hide();
	}, 1000);
}

function filtreValidation(etat){//valider les traitements sur taille réel ou non
       	$('#loading_circle').show();
	if(etat == 'true' && filtre_utilise != null){
		canvas_reel = document.createElement('canvas');
		canvas_reel.height = image_modif.height;
		canvas_reel.width = image_modif.width;
		canvas_reel.getContext('2d').drawImage(image_modif,0,0);
		Caman(canvas_reel, function(){
			this[filtre_utilise]();
			this.render(function(){
				image_modif.src = canvas_reel.toDataURL("image/jpeg");
                        	$('#loading_circle').hide();
				filtre_utilise = null;
				$(canvas_traitement).remove();
				delete canvas_reel, canvas_traitement;
				canvas_traitement = document.createElement('canvas'); //pour ne pas perdre les filtre au preview avec this.revert()
			});
		});
	} else if (filtre_utilise != null){
		Caman(canvas_traitement, function(){
			this.revert();
			this.render(function(){
				filtre_utilise = null;
				image_affiche.src = canvas_traitement.toDataURL("image/jpeg");
                        	$('#loading_circle').hide();
			});
		});
	} else {
		$('#loading_circle').hide();
	}

	$('#filtre_zone #validation').hide();
	$('#filtre_zone #filtre').show();
	
}

function camanFiltre(filtre){//pour le préview
	$('#loading_circle').show();
	Caman(canvas_traitement, function(){
		if(filtre == "normal"){
			this.revert();
			filtre_utilise = filtre;
		}else if(filtre in this){
			filtre_utilise = filtre;
			this.revert();
			this[filtre]();
		}
		this.render(function(){
			image_affiche.src = canvas_traitement.toDataURL("image/jpeg");
			$('#filtre_zone #validation button').attr({onclick:"filtreValidation(this.value)"});
			$('#filtre_zone #filtre').hide();
			$('#filtre_zone #validation').show();
			$('#loading_circle').hide();
		});
	});
}

function slider_change(slider_id, traitement_id){
	var slider = document.getElementById(slider_id);
	for (var i = 0; i < traitements.length; i++){
	var traitement = traitements[i];
		if(traitement.id == traitement_id){
			traitement[slider.id] = parseFloat(slider.value);
                        traitement.update();
			return;
		}
	}
}

function reset(){
	$('#loading_circle').show();
	$('#filtre').empty();
	$('#filtre_zone #validation').empty();
	$('#traitement_zone').empty();
	$(canvas_traitement).remove();
	delete canvas_traitement;
	canvas_traitement = document.createElement('canvas');
	$(canvas_glfx).remove();
	delete canvas_glfx;
	canvas_glfx = fx.canvas();
	image_modif.src = image_base.src;//image_affiche change à onload de image_modif
	filtre_utilise = null;
	setSelectedTraitement(null);

	/////////
	//  Filtres
	/////////
        for(var i = 0; i < filtres.length; i++){
		var filtre = filtres[i];
                $('#filtre').append('<button type="button" class="btn" id="'+filtre+'">'+filtre+'</button>');
        }
	$('#filtre_zone #validation').append('<button id="valider" type="button" value="true" class="btn" onclick="filtreValidation(this.value)">Valider</button>' +
	'<button id="annuler" type="button" value="false" class="btn" onclick="filtreValidation(this.value)">Annuler</button>');

        $('#filtre button').click(function(e){
                camanFiltre(this.id);
        });

        /////////
        //  Traitements
        /////////
	$('#traitement_zone').append('<ul id="traitement" class="center-block nav nav-pills nav-justified"></ul');
	$('#traitement_zone').append('<div id="traitement_parametre" class="tab-content"></div>');
       for(var i = 0; i < traitements.length; i++){
		var traitement = traitements[i];
		
               $('#traitement').append('<li><a data-toggle="tab" href="#'+traitement.id+'" onclick="setSelectedTraitement(\''+traitement.id+'\')">'+traitement.label+'</a></li>');

                /////////
                //  Sliders
                ///////// 
		var html = '<div id="'+traitement.id+'" class="row center-block tab-pane fade in">';
                for(var j = 0; j < traitement.sliders.length; j++){
			var slider = traitement.sliders[j];
                        html += '<input type="range" id="'+slider.id+'" />';
                }
                html += '</div>';
                $('#traitement_parametre').append(html);
                for(var j = 0; j < traitement.sliders.length; j++){
			var slider = traitement.sliders[j];
                        traitement[slider.id] = slider.value;
                        $('#'+slider.id).attr({
                                'oninput': "slider_change(this.id,'"+traitement.id+"')",
                                'onchange': "slider_change(this.id,'"+traitement.id+"')",
                                min: slider.min,
                                max: slider.max,
                                value: slider.value,
                                step: slider.step
                        });

                }


		//////////
		//  Valider/Annuler
		//////////
		$('#'+traitement.id).append('<button id="valider" type="button" value="true" class="btn">Valider</button>'+
		'<button id="annuler" type="button" value="false" class="btn">Annuler</button>');
		$('#'+traitement.id+' #valider').on('click',{traitement:traitement},function(event){
			event.data.traitement.validate();
		});
		$('#'+traitement.id+' #annuler').on('click',annuler);
        

	        /////////
                //  Nubs (position on image)
                /////////
		var nub_present = false;
		for (var j = 0; j < traitement.nubs.length; j++) {
			var nub = traitement.nubs[j];
			var x = nub.x * canvas_glfx.width;
			var y = nub.y * canvas_glfx.height;
			traitement[nub.id] = { x: x, y: y };
			if(nub_present == false){
				//$('#image_zone').append('<div id="nubs"></div>');
				nub_present = true;
			}
		}
	
		if (traitement.reset){
				traitement.reset();
		}
	}

	$('#loading_circle').hide();
}

function setSelectedTraitement(traitement_id){
	$('#image_zone .nub').remove();
	$('#traitement_parametre > div').removeClass('active');
	$('#traitement > li').removeClass('active');
	$('#image_zone .nub').remove();
	image_affiche.src = canvas_traitement.toDataURL('image/jpeg');
	if(traitement_id == null){
		return;
	}
	$('#'+traitement_id).addClass('active');
//	image_affiche.src = canvas_traitement.toDataURL('image/jpeg');
	var traitement;
	for (var i = 0; i < traitements.length; i++){
		traitement = traitements[i];
		if(traitement.id == traitement_id){
			break;
		}
	}

	// Reset all sliders
	for (var i = 0; i < traitement.sliders.length; i++) {
		var slider = traitement.sliders[i];
		document.getElementById(slider.id).value = parseFloat(slider.value);
		traitement[slider.id] = parseFloat(slider.value);
	}

	
	$('body').off('resize');
	$('body').off('orientationchange');
	// Generate all nubs
	for (var i = 0; i < traitement.nubs.length; i++) {
		var nub = traitement.nubs[i];
		
		var x = nub.x * canvas_glfx.width;
		var y = nub.y * canvas_glfx.height;
		$('<div class="nub" id="'+ nub.id +'"></div>').appendTo($('#image').parent());
		image_position.screen.left =  ($('#'+nub.id).parent().width() - $('#image').width())/2 + $('#'+nub.id).parent().offset().left;
		image_position.screen.top = ($('#'+nub.id).parent().height() - $('#image').height())/2 + $('#'+nub.id).parent().offset().top;
		image_position.modal.left = image_position.screen.left - ($('#image_zone').offset().left - $('#'+nub.id).parent().position().left);
		image_position.modal.top = image_position.screen.top - ($('#'+nub.id).parent().offset().top - $('#'+nub.id).parent().position().top);

		/////////
		//  Event pour le déplacement des nubs
		/////////

		var ontouchmove = (function(event) {////	TACTILE
			/*image_position.screen.left =  ($('#image_zone').width() - $('#image').width())/2 + $('#image_zone').offset().left;
		        image_position.screen.top = ($('#image_zone').height() - $('#image').height())/2 + $('#image_zone').offset().top;
		        image_position.modal.left = image_position.screen.left - ($('#image_zone').offset().left - $('#image_zone').position().left);
		        image_position.modal.top = image_position.screen.top - ($('#image_zone').offset().top - $('#image_zone').position().top);
*/
			var e = event.originalEvent;
			var offset = $(event.target).offset();
                        var nub = event.data.nub;
                        var position_actuel_x = offset.left + $(nub).width()/2 - image_position.screen.left;
                        var position_actuel_y = offset.top + $(nub).height()/2 - image_position.screen.top;
                        var x = (e.touches[0].pageX - image_position.screen.left)*(canvas_glfx.width/$('#image').width());
                        var y = (e.touches[0].pageY - image_position.screen.top)*(canvas_glfx.height/$('#image').height());

                        //console.log("event.pageX:"+e.touches[0].pageX+", event.pageY:"+e.touches[0].pageY+", x:"+ x +", y:"+ y);
                        if(x<0) x = 0;
                        if(x>canvas_glfx.width) x = canvas_glfx.width;
                        if(y<0) y = 0;
                        if(y>canvas_glfx.height) y = canvas_glfx.height;

			$('#' + nub.id).css({ left: (x*($('#image').width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image').height()/canvas_glfx.height))+ image_position.modal.top});

			traitement[nub.id] = { x: x, y: y };
                        //traitement.update();
		});
		var onmousemove = (function(event) {////	SOURIS
			/*image_position.screen.left =  ($('#image_zone').width() - $('#image').width())/2 + $('#image_zone').offset().left;
                        image_position.screen.top = ($('#image_zone').height() - $('#image').height())/2 + $('#image_zone').offset().top;
                        image_position.modal.left = image_position.screen.left - ($('#image_zone').offset().left - $('#image_zone').position().left);
                        image_position.modal.top = image_position.screen.top - ($('#image_zone').offset().top - $('#image_zone').position().top);
*/
			var offset = $(event.target).offset();
			var nub = event.data.nub;
			var x = (event.pageX - image_position.screen.left)*(canvas_glfx.width/$('#image').width());
			var y = (event.pageY - image_position.screen.top)*(canvas_glfx.height/$('#image').height());

			////console.log("nub.id:"+nub.id+", event.paxeX:"+event.pageX+", event.pageY:"+event.pageY+", position_actuel_x:"+position_actuel_x+", position_actuel_y:"+position_actuel_y+", x:"+ x +", y:"+ y);
                        if(x<0) x = 0;
                        if(x>canvas_glfx.width) x = canvas_glfx.width;
                        if(y<0) y = 0;
                        if(y>canvas_glfx.height) y = canvas_glfx.height;
			
			$('#' + nub.id).css({ left: (x*($('#image').width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image').height()/canvas_glfx.height))+ image_position.modal.top});			
			traitement[nub.id] = { x: x, y: y };
			traitement.update();
		});

		/////////
		//  Atribution des events
		////////

		//	TACTILE
		//$('#' + nub.id).on('touchmove',{nub:nub},ontouchmove);
		$('#' + nub.id).on('touchstart',function(event){
			//console.log('drag activated');
			//$('#'+ event.target.id).on('mousemove',onmousemove);
			$('body').on('touchmove',{nub:event.target},ontouchmove);
		});
		$('body').on('touchend', function(event){
			//console.log('drag disactivated');
			$('body').off('touchmove',ontouchmove);
			traitement.update();
		});

		//	SOURIS
		$('#' + nub.id).mousedown(function(event){
			//console.log('drag activated');
			//$('#'+ event.target.id).on('mousemove',onmousemove);
			$('body').on('mousemove',{nub:event.target},onmousemove);
		});
		$('body').mouseup(function(event){
			//console.log('drag disactivated');
			$('body').off('mousemove',onmousemove);
		});
		var actualisePos = function(event){
			var traitement = event.data.traitement;
			var nub = event.data.nub;
			var x = traitement[nub.id].x;
			var y = traitement[nub.id].y;
                        image_position.screen.left =  ($('#'+nub.id).parent().width() - $('#image').width())/2 + $('#'+nub.id).parent().offset().left;
                        image_position.screen.top = ($('#'+nub.id).parent().height() - $('#image').height())/2 + $('#'+nub.id).parent().offset().top;
                        image_position.modal.left = image_position.screen.left - ($('#image_zone').offset().left - $('#'+nub.id).parent().position().left);
                       	image_position.modal.top = image_position.screen.top - ($('#'+nub.id).parent().offset().top - $('#'+nub.id).parent().position().top);
			$('#' + nub.id).css({ left: (x*($('#image').width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image').height()/canvas_glfx.height))+ image_position.modal.top});
		};

		$(window).on('orientationchange',{nub:nub,traitement:traitement},actualisePos);
		$(window).on('resize',{nub:nub,traitement:traitement},actualisePos);


		$('#' + nub.id).css({ left: (x*($('#image').width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image').height()/canvas_glfx.height))+ image_position.modal.top});
		traitement[nub.id] = { x: x, y: y };
	}
	traitement.update();
}

function crop(){// JCrop
	$('#loading_circle').show();
	$('#image_zone #image').cropper({
		aspectRatio: image_modif.width/image_modif.height, //forcer l'aspect du crop à celui de l'image originale
		crop: function(e) {
			// Output the result data for cropping image.
 		}		
	});
	$('#crop button').attr({onclick:"cropValidation(this.value)"});
        $('#loading_circle').hide();
}

function cropValidation(etat){
	$('#loading_circle').show();
	if(etat == "true"){
		var data = $("#image_zone #image").cropper("getData");//get pos and crop preview et reel
		canvas_traitement.width = data.width / ratio_image;		
		canvas_traitement.height = data.height / ratio_image;
		canvas_traitement.getContext("2d").drawImage(image_modif, -data.x/ratio_image,-data.y/ratio_image);
		image_modif.src = canvas_traitement.toDataURL("image/jpeg");
		//image_affiche.src = canvas_traitement.toDataURL("image/jpeg");
		$(canvas_glfx).remove();
		delete canvas_glfx;
		canvas_glfx = fx.canvas();
	}
	$('#image_zone #image').cropper("destroy");
	$('#famille li').removeClass("active");
	$('.tab-content div').removeClass("active");
        $('#loading_circle').hide();
}

function annuler(){
	cropValidation("false");
	filtreValidation("false");
	setSelectedTraitement(null);
}

function upload(){
	$('#loading_circle').show();
	var canvas_rendu_final = document.createElement('canvas');
	canvas_rendu_final.width = image_modif.width;
	canvas_rendu_final.height = image_modif.height;
	canvas_rendu_final.getContext('2d').drawImage(image_modif,0,0);
       
	var url = canvas_rendu_final.toDataURL("image/jpeg",1);
        url = url.replace(/^data:image\/(png|jpeg);base64,/,"");

        $.ajax({
                type: 'POST',
                url: 'upload.php',
                data: { "imageData" : url },
                success: function(msg){
                        $('#loading_circle').hide();
                }
        });

	delete canvas_rendu_final;
}

////////////////////
//	GLFX	  //
////////////////////

function Traitement(id, label, init, update, validate,flip_canvas, reset){
	this. label = label;
	this.id = id;
	this.update = update;
	this.reset = reset;
	this.sliders = [];
	this.nubs = [];
	this.flip_canvas = flip_canvas;
	this.validate = validate
	init.call(this);
}

Traitement.prototype.addSlider = function(id,label,min,max,value,step){
	this.sliders.push({id: id, label: label, min: min, max: max, value: value, step: step});
};

Traitement.prototype.addNub = function(id, x, y) {
    this.nubs.push({ id: id, x: x, y: y });
};

var flip = false;
for(var i = 0; i < devices_glfx_flip.length; i++){
	var device = devices_glfx_flip[i];
	if(navigator.platform === device){
		flip = true;
		break;
	}
}

var traitements = [
		new Traitement('Brightness-Contrast', 'Luminositée / Contrast', function(){
			this.addSlider('brightness', 'Luminosité', -1, 1, 0, 0.1);
			this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.1);
		}, function() {
                        $('#loading_circle').show();
			canvas_glfx.draw(texture).brightnessContrast(this.brightness, this.contrast).update();
			if(this.flip_canvas){
				var canvas_flip = document.createElement('canvas');
				canvas_flip.height = canvas_glfx.height;
				canvas_flip.width = canvas_glfx.width;
				canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
				image_affiche.src = canvas_flip.toDataURL("image/jpeg");
				$(canvas_flip).remove();
				delete canvas_flip;
			} else {
				image_affiche.src = canvas_glfx.toDataURL("image/jpeg");
			}
                        $('#loading_circle').hide();
			//console.log('appliqué');
		}, function() {
			$('#loading_circle').show();
		//	canvas_glfx.height = image_modif.height;
		//	canvas_glfx.width = image_modif.width;
			
			canvas_glfx.draw(canvas_glfx.texture(image_modif)).brightnessContrast(this.brightness, this.contrast).update();
                        if(this.flip_canvas){
                                var canvas_flip = document.createElement('canvas');
                                canvas_flip.height = canvas_glfx.height;
                                canvas_flip.width = canvas_glfx.width;
                                canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
                                image_modif.src = canvas_flip.toDataURL("image/jpeg");
                                $(canvas_flip).remove();
                                delete canvas_flip;
                        } else {
                                image_modif.src = canvas_glfx.toDataURL("image/jpeg");
                        }
                        //canvas_traitement.getContext('2d').drawImage(canvas_glfx,0,0);
			setSelectedTraitement(null);
			$('#loading_circle').hide();
		}, flip),
		new Traitement('Hue-Saturation', 'Hue / Saturation', function() {
			this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
			this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
		}, function() {
                        $('#loading_circle').show();
			canvas_glfx.draw(texture).hueSaturation(this.hue, this.saturation).update();
			if(this.flip_canvas){
				var canvas_flip = document.createElement('canvas');
				canvas_flip.height = canvas_glfx.height;
				canvas_flip.width = canvas_glfx.width;
				canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
				image_affiche.src = canvas_flip.toDataURL("image/jpeg");
				$(canvas_flip).remove();
				delete canvas_flip;
			} else {
				image_affiche.src = canvas_glfx.toDataURL("image/jpeg");
			}
                        $('#loading_circle').hide();
			//console.log('appliqué');
		}, function() {
			$('#loading_circle').show();
		//	canvas_glfx.height = image_modif.height;
		//	canvas_glfx.width = image_modif.width;
			canvas_glfx.draw(canvas_glfx.texture(image_modif)).hueSaturation(this.hue, this.saturation).update();
                        if(this.flip_canvas){
                                var canvas_flip = document.createElement('canvas');
                                canvas_flip.height = canvas_glfx.height;
                                canvas_flip.width = canvas_glfx.width;
                                canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
                                image_modif.src = canvas_flip.toDataURL("image/jpeg");
                                $(canvas_flip).remove();
                                delete canvas_flip;
                        } else {
                                image_modif.src = canvas_glfx.toDataURL("image/jpeg");
                        }
                        //canvas_traitement.getContext('2d').drawImage(canvas_glfx,0,0);
			setSelectedTraitement(null);
		$('#loading_circle').hide();
		}, flip),
		new Traitement('Tilt-Shift', 'Tilt Shift', function() {
			this.addNub('start', 0.15, 0.75);
			this.addNub('end', 0.75, 0.6);
			this.addSlider('blurRadius', 'Radius', 0, 50, 15, 1);
			this.addSlider('gradientRadius', 'Thickness', 0, 400, 200, 1);
		}, function() {
                        $('#loading_circle').show();
			canvas_glfx.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
			if(this.flip_canvas){
				var canvas_flip = document.createElement('canvas');
				canvas_flip.height = canvas_glfx.height;
				canvas_flip.width = canvas_glfx.width;
				canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
				image_affiche.src = canvas_flip.toDataURL("image/jpeg");
				$(canvas_flip).remove();
				delete canvas_flip;
			} else {
			//ratio_image = resizeCanvasImage(image_modif, canvas_glfx, 550,550);
				image_affiche.src = canvas_glfx.toDataURL("image/jpeg");
				//$('#image_url').text("this.start.x,"+this.start.x+" this.start.y,"+this.start.y+" this.end.x,"+this.end.x+" this.end.y "+this.end.y);
			}
                        $('#loading_circle').hide();
			//console.log('appliqué');
		}, function() {
			$('#loading_circle').show();
		//	canvas_glfx.height = image_modif.height;
		//	canvas_glfx.width = image_modif.width;
			canvas_glfx.draw(canvas_glfx.texture(image_modif)).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
                        if(this.flip_canvas){
                                var canvas_flip = document.createElement('canvas');
                                canvas_flip.height = canvas_glfx.height;
                                canvas_flip.width = canvas_glfx.width;
                                canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
                                image_modif.src = canvas_flip.toDataURL("image/jpeg");
                                $(canvas_flip).remove();
                                delete canvas_flip;
                        } else {
                                image_modif.src = canvas_glfx.toDataURL("image/jpeg");
                        }
                        //canvas_traitement.getContext('2d').drawImage(canvas_glfx,0,0);
			setSelectedTraitement(null);
			$('#loading_circle').hide();
		}, flip)
	];

delete flip, device;

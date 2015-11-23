(function ($){
//
//Image de grande taille tronqué avec webgl sur chromium, fonctionnel sur firefox
//Erreur: out of range
//
//TODO ajouter bootstrap popover (affiche petit message)
//TODO ajouter préfixe aux variable (ex: ie-varibale)
//TODO ajouter progressBar pour upload


//Chargement de tout les autres scripts necessaire à partir du path de celui-ci lorsque tout les scripts ont été chargé
$( "script" ).on('load', function(){
    var filename = 'image-editor';
    var scripts = document.getElementsByTagName('script');
    if (scripts && scripts.length > 0) {
        for (var i=0;i< scripts.length;i++) {
            if (scripts[i].src &&  scripts[i].src.match(new RegExp(filename+'\\.js$'))) {
		var dir = scripts[i].src.replace(new RegExp('(.*)'+filename+'\\.js$'), '$1');
		//bloquer les event jquery pour charger en avance glfx(necessaire a l'init)
		$.holdReady( true );
		$.getScript( dir+"/dependence/glfx.js", function() {
	       		$.holdReady( false );
	       	});
		$.getScript(dir+"/dependence/cropper.min.js");
		$.getScript(dir+"/dependence/caman.full.js");
		defaults.path = dir;
		break;
            }
        }
    }
});

var image_base = new Image();
var image_modif = new Image();//taille réel (pour save/upload)
var image_affiche = new Image();//petite taille préview (pour traitement CamanJS)
var canvas_traitement = document.createElement('canvas');//pour effectuer les traitements de filtre
var filtre_utilise = null;
var ratio_image;
var canvas_glfx = null;
var texture = null;
var settings = {};
var defaults = {
	urlImage: null,
	urlServeur: null,
	formatImageSave: 'png',
	imageName: 'image',
	path: "",
	modal: null};
var format_possible = ['png','jpeg','webp'];
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

$.fn.imageEditor = function(option){ 
	var zone = null;
	this.filter('div').each(function(){
		zone = $(this);
	});
	$(document).ready(function(){

		if(canvas_glfx != null){
			return;
		}
		// Try to get a WebGL canvas
		if (!window.fx) {
			alert('glfx.js n\'a pas chargé.');
			return;
		}
		try {
			canvas_glfx = fx.canvas();
		} catch (e) {
			alert('Désolé, ce navigateur ne suporte pas WebGL');
			return;
		}
		settings = $.extend({},defaults,option);

		if(zone==null){
			zone = 'body';
		}
		var id = 'modalImageEditor';
		var i = 0;
		while($('#'+id+i).length){
			i++;
		}
		var modalAttr = {
			 main:{
				class: 'modal fade',
				id: id+i,
				tabindex: '-1',
				role: 'dialog',
				'aria-labelledby': 'modalImageEditor',
				'data-backdrop': 'static'
			}, dialog: {
				class: 'modal-dialog modal-lg',
				role: 'document'
			}, content: {
				class: 'modal-content'
			} };
		settings.modal = $('<div />').attr(modalAttr.main).appendTo(zone);
		var dialog = $('<div />').attr(modalAttr.dialog).appendTo(settings.modal);
		var content = $('<div />').attr(modalAttr.content).appendTo(dialog);

		//Affichage du modal par défaut
		$('<div />').attr({class: 'modal-body'}).text('Erreur').appendTo(content);
		var footer = $('<div />').attr({class: 'modal-footer'}).appendTo(content)
		$('<button />').attr({'data-dismiss': 'modal'}).text('close').appendTo(footer);

	});
};

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

$.fn.editImage = function(options){


	if(canvas_glfx == null) return;

	settings = $.extend({}, defaults, settings, options);

	var format_ok = false;
	for(var i = 0; i < format_possible.length; i++){
		if (settings.formatImageSave == format_possible[i]){
			format_ok = true;
			break;
		}
	}
	if(!format_ok){
		settings.formatImageSave = 'png';
	}
	settings.modal.modal().load(settings.path+'image-editor.html'/*+'?'+(new Date().getTime())*/, function(e){
		$('.modal-title', settings.modal).text('Image Editor - '+settings.imageName+'.'+settings.formatImageSave);
		$('#loading_circle', settings.modal).attr({src: settings.path+'/dependence/loading_circle.gif'});
		$('#famille li',settings.modal).removeClass("active");
		$('.tab-content div',settings.modal).removeClass("active");
		$('#loading_circle',settings.modal).show();
		$('#image_url',settings.modal).empty();
		$('#image_zone',settings.modal).empty();
		image_affiche.onload = function () { //premier chargement de l'image affichée
			$('#image_zone',settings.modal).empty().append(image_affiche);
			$('#loading_circle',settings.modal).hide();
			image_affiche.onload = null;
			reset();
		};

		image_modif.onload = function(){

			ratio_image = resizeCanvasImage(image_modif, canvas_traitement, 550,550);
			image_affiche.src = canvas_traitement.toDataURL("image/png");

			canvas_glfx.height = canvas_traitement.height;
			canvas_glfx.width = canvas_traitement.width;
			texture = canvas_glfx.texture(image_affiche);
		};

		var erreur = function () {
			$('#image_zone',settings.modal).empty().html('<p class="text-center">That image is not available('+settings.urlImage+').</p>');
			$('#loading_circle',settings.modal).hide();
		}
		image_base.onerror = erreur;
		image_affiche.onerror = erreur;

		image_base.src = settings.urlImage; //"image/unnamed3.jpg";
		image_modif.src = settings.urlImage;
		$('#li_crop',settings.modal).on('click',function(){annuler();crop();});
		$('#li_filtre',settings.modal).on('click',function(){annuler()});
		$('#li_traitement',settings.modal).on('click',function(){annuler()});
		$('#li_comparer',settings.modal).on('click',function(){$("#image_zone #image",settings.modal).cropper('destroy');affiche_base();});
		$('#li_reset',settings.modal).on('click',function(){annuler();reset()});
		$('#crop button',settings.modal).on('click',function(){cropValidation(this.value)});

		$('#image_zone',settings.modal).empty().html('<p class="text-center">Loading...</p>');

		//button save
		var a = $('.modal-footer #button #save').attr({'target':'_blank'});
		a.on('click',function(e){
			$(this).attr({'href': image_modif.src, 'download': settings.imageName+"."+settings.formatImageSave});
		});
		
		//button d'upload
		if(settings.urlServeur != null){
			$('<button />').attr({id:'upload', type:'button', class: 'btn'})
			.text('Upload')
			.on('click',upload)
			.prependTo('.modal-footer #button', settings.modal);
		}
	});

}

function download(filename, text) {
}

function affiche_base(){
	$('#loading_circle',settings.modal).show();
	var canvas_base = document.createElement('canvas');
	resizeCanvasImage(image_base, canvas_base, 550, 550);
	image_affiche.src = canvas_base.toDataURL("image/png");	
	setTimeout(function(){
		image_affiche.src = canvas_traitement.toDataURL("image/png");
		$('#loading_circle',settings.modal).hide();
	}, 1000);
}

function filtreValidation(etat){//valider les traitements sur taille réel ou non
       	$('#loading_circle',settings.modal).show();
	if(etat == 'true' && filtre_utilise != null){
		canvas_reel = document.createElement('canvas');
		canvas_reel.height = image_modif.height;
		canvas_reel.width = image_modif.width;
		canvas_reel.getContext('2d').drawImage(image_modif,0,0);
		Caman(canvas_reel, function(){
			this[filtre_utilise]();
			this.render(function(){
				image_modif.src = canvas_reel.toDataURL("image/"+settings.formatImageSave,1);
				filtre_utilise = null;
				$(canvas_traitement).remove();
				delete canvas_reel, canvas_traitement;
				canvas_traitement = document.createElement('canvas'); //pour ne pas perdre les filtre au preview avec this.revert()
				$('#filtre_zone #filtre',settings.modal).show();
                        	$('#loading_circle',settings.modal).hide();
			});
		});
	} else if (filtre_utilise != null){
		Caman(canvas_traitement, function(){
			this.revert();
			this.render(function(){
				filtre_utilise = null;
				image_affiche.src = canvas_traitement.toDataURL("image/png");
                        	$('#loading_circle',settings.modal).hide();
				$('#filtre_zone #filtre',settings.modal).show();
			});
		});
	} else {
		$('#loading_circle',settings.modal).hide();
				$('#filtre_zone #filtre',settings.modal).show();
	}

	$('#filtre_zone #validation',settings.modal).hide();
	
}

function camanFiltre(filtre){//pour le préview
	$('#loading_circle',settings.modal).show();
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
			image_affiche.src = canvas_traitement.toDataURL("image/png");
			$('#filtre_zone #filtre',settings.modal).hide();
			$('#filtre_zone #validation',settings.modal).show();
			$('#loading_circle',settings.modal).hide();
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
	$(window).off('resize');
	$(window).off('orientationchange');
	$('#loading_circle',settings.modal).show();
	$('#filtre',settings.modal).empty();
	$('#filtre_zone #validation',settings.modal).empty();
	$('#traitement_zone',settings.modal).empty();
	$(canvas_traitement).remove();
	delete canvas_traitement;
	canvas_traitement = document.createElement('canvas');
	$(canvas_glfx).remove();
	delete canvas_glfx;
	canvas_glfx = fx.canvas();
	image_modif.src = image_base.src;//image_affiche change à onload de image_modif
	filtre_utilise = null;

	/////////
	//  Filtres
	/////////
        for(var i = 0; i < filtres.length; i++){
		var filtre = filtres[i];
		$('<button />').attr({type:"button", class:"btn", id:filtre})
		.text(filtre)
		.appendTo('#filtre',settings.modal)
		.on('click', function(){camanFiltre(this.id)});
        }
	$('<button />').attr({id:"valider", type:"button", value:"true", class:"btn"})
	.text("Valider")
	.appendTo('#filtre_zone #validation',settings.modal)
	.on('click',function(){filtreValidation(this.value)});

	$('<button />').attr({id:"annuler", type:"button", value:"false", class:"btn"})
	.text("Annuler")
	.appendTo('#filtre_zone #validation',settings.modal)
	.on('click',function(){filtreValidation(this.value)})
	.parent().hide();
        ///////////
        //  Traitements
        /////////
	$('<ul />').attr({id:"traitement", class:"center-block nav nav-pills nav-justified"}).appendTo('#traitement_zone',settings.modal);
	$('<ul />').attr({id:"traitement_parametre", class:"tab-content"}).appendTo('#traitement_zone',settings.modal);
       for(var i = 0; i < traitements.length; i++){
		var traitement = traitements[i];
		
		var li = $('<li />').appendTo('#traitement',settings.modal);
		$('<a />').attr({'data-toggle':"tab", href:'#'+traitement.id})
		.text(traitement.label)
		.on('click',{traitement:traitement},function(event){
			var traitement = event.data.traitement
		setSelectedTraitement(traitement.id)})
		.appendTo(li);

                /////////
                //  Sliders
                ///////// 
		if(traitement.sliders.length){
			var div_traitement = $('<div />').attr({id:traitement.id, class:"row center-block tab-pane fade in table-responsive"}).appendTo('#traitement_parametre',settings.modal);
			var table = $('<table />').attr({class:'table'}).appendTo(div_traitement);
		}
                for(var j = 0; j < traitement.sliders.length; j++){
			var slider = traitement.sliders[j];
			var tr = $('<tr />').appendTo(table);
			$('<th />').text(slider.label).appendTo(tr);
                        traitement[slider.id] = slider.value;
			var th = $('<th />').appendTo(tr);
                        $('<input />').attr({
				type:"range", 
				id:slider.id,
                                min: slider.min,
                                max: slider.max,
                                value: slider.value,
                                step: slider.step
                        }).on('input',{slider:slider, traitement:traitement}, function(event){
				var slider = event.data.slider;
				var traitement = event.data.traitement;
				slider_change(slider.id,traitement.id)})
                        .on('change',{slider:slider, traitement:traitement}, function(event){
				var slider = event.data.slider;
				var traitement = event.data.traitement;
				slider_change(slider.id,traitement.id)})
			.appendTo(th);
                }


		//////////
		//  Valider/Annuler
		//////////
		$('<button />').attr({id:"valider", type:"button", value:"true", class:"btn"})
		.text('Valider')
		.appendTo('#'+traitement.id,settings.modal)
		.on('click',{traitement:traitement},function(event){
			event.data.traitement.validate();
		});
		$('<button />').attr({id:"annuler", type:"button", value:"false", class:"btn"})
		.text('Annuler')
		.appendTo('#'+traitement.id,settings.modal)
		.on('click',annuler);
        

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
				nub_present = true;
			}
		}
	
		if (traitement.reset){
			traitement.reset();
		}
	}

	$('#loading_circle',settings.modal).hide();
}

function setSelectedTraitement(traitement_id){
	$('#image_zone .nub',settings.modal).remove();
	$('#traitement_parametre > div',settings.modal).removeClass('active');
	$('#traitement > li',settings.modal).removeClass('active');
	$('#image_zone .nub',settings.modal).remove();
	image_affiche.src = canvas_traitement.toDataURL('image/png');
	if(traitement_id == null){
		return;
	}
	$('#'+traitement_id,settings.modal).addClass('active');
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
		$('<div class="nub" id="'+ nub.id +'"></div>').appendTo($('#image',settings.modal).parent());
		image_position.screen.left =  ($('#'+nub.id,settings.modal).parent().width() - $('#image',settings.modal).width())/2 + $('#'+nub.id,settings.modal).parent().offset().left;
		image_position.screen.top = ($('#'+nub.id,settings.modal).parent().height() - $('#image',settings.modal).height())/2 + $('#'+nub.id,settings.modal).parent().offset().top;
		image_position.modal.left = image_position.screen.left - ($('#image_zone',settings.modal).offset().left - $('#'+nub.id,settings.modal).parent().position().left);
		image_position.modal.top = image_position.screen.top - ($('#'+nub.id,settings.modal).parent().offset().top - $('#'+nub.id,settings.modal).parent().position().top);

		/////////
		//  Event pour le déplacement des nubs
		/////////

		var ontouchmove = (function(event) {////	TACTILE
			var e = event.originalEvent;
			var offset = $(event.target).offset();
                        var nub = event.data.nub;
                        var position_actuel_x = offset.left + $(nub).width()/2 - image_position.screen.left;
                        var position_actuel_y = offset.top + $(nub).height()/2 - image_position.screen.top;
                        var x = (e.touches[0].pageX - image_position.screen.left)*(canvas_glfx.width/$('#image',settings.modal).width());
                        var y = (e.touches[0].pageY - image_position.screen.top)*(canvas_glfx.height/$('#image',settings.modal).height());

                        if(x<0) x = 0;
                        if(x>canvas_glfx.width) x = canvas_glfx.width;
                        if(y<0) y = 0;
                        if(y>canvas_glfx.height) y = canvas_glfx.height;

			$('#' + nub.id,settings.modal).css({ left: (x*($('#image',settings.modal).width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image',settings.modal).height()/canvas_glfx.height))+ image_position.modal.top});

			traitement[nub.id] = { x: x, y: y };

			// activer ou désactiver le traitement continue pour les ecrans tactiles
			//traitement.update();
		});
		var onmousemove = (function(event) {////	SOURIS
			var offset = $(event.target).offset();
			var nub = event.data.nub;
			var x = (event.pageX - image_position.screen.left)*(canvas_glfx.width/$('#image',settings.modal).width());
			var y = (event.pageY - image_position.screen.top)*(canvas_glfx.height/$('#image',settings.modal).height());

                        if(x<0) x = 0;
                        if(x>canvas_glfx.width) x = canvas_glfx.width;
                        if(y<0) y = 0;
                        if(y>canvas_glfx.height) y = canvas_glfx.height;
			
			$('#' + nub.id,settings.modal).css({ left: (x*($('#image',settings.modal).width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image',settings.modal).height()/canvas_glfx.height))+ image_position.modal.top});			
			traitement[nub.id] = { x: x, y: y };
			traitement.update();
		});

		/////////
		//  Atribution des events
		////////

		//	TACTILE
		$('#' + nub.id,settings.modal).on('touchstart',function(event){
			$('body').on('touchmove',{nub:event.target},ontouchmove);
		});
		$('body').on('touchend', function(event){
			$('body').off('touchmove',ontouchmove);
			traitement.update();
		});

		//	SOURIS
		$('#' + nub.id,settings.modal).mousedown(function(event){
			$('body').on('mousemove',{nub:event.target},onmousemove);
		});
		$('body').mouseup(function(event){
			$('body').off('mousemove',onmousemove);
		});

		var actualisePos = function(event){
			var traitement = event.data.traitement;
			var nub = event.data.nub;
			var x = traitement[nub.id].x;
			var y = traitement[nub.id].y;
                        image_position.screen.left =  ($('#'+nub.id,settings.modal).parent().width() - $('#image',settings.modal).width())/2 + $('#'+nub.id,settings.modal).parent().offset().left;
                        image_position.screen.top = ($('#'+nub.id,settings.modal).parent().height() - $('#image',settings.modal).height())/2 + $('#'+nub.id,settings.modal).parent().offset().top;
                        image_position.modal.left = image_position.screen.left - ($('#image_zone',settings.modal).offset().left - $('#'+nub.id,settings.modal).parent().position().left);
                       	image_position.modal.top = image_position.screen.top - ($('#'+nub.id,settings.modal).parent().offset().top - $('#'+nub.id,settings.modal).parent().position().top);
			$('#' + nub.id,settings.modal).css({ left: (x*($('#image',settings.modal).width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image',settings.modal).height()/canvas_glfx.height))+ image_position.modal.top});
		};

		$(window).on('orientationchange',{nub:nub,traitement:traitement},actualisePos);
		$(window).on('resize',{nub:nub,traitement:traitement},actualisePos);


		$('#' + nub.id,settings.modal).css({ left: (x*($('#image',settings.modal).width()/canvas_glfx.width))+ image_position.modal.left,  top: (y*($('#image',settings.modal).height()/canvas_glfx.height))+ image_position.modal.top});
		traitement[nub.id] = { x: x, y: y };
	}
	traitement.update();
}

function crop(){// JCrop
	$('#loading_circle',settings.modal).show();
	$('#image_zone #image',settings.modal).cropper({
		aspectRatio: image_modif.width/image_modif.height //forcer l'aspect du crop à celui de l'image originale
	});
        $('#loading_circle',settings.modal).hide();
}

function cropValidation(etat){
	$('#loading_circle',settings.modal).show();
	if(etat == "true"){
		var data = $("#image_zone #image").cropper("getData");//get pos and crop preview et reel
		canvas_traitement.width = data.width / ratio_image;		
		canvas_traitement.height = data.height / ratio_image;
		canvas_traitement.getContext("2d").drawImage(image_modif, -data.x/ratio_image,-data.y/ratio_image);
		image_modif.src = canvas_traitement.toDataURL("image/"+settings.formatImageSave,1);
		//Problème de recadrage sur canvas_glfx
		$(canvas_glfx).remove();
		delete canvas_glfx;
		canvas_glfx = fx.canvas();
	}
	$('#image_zone #image',settings.modal).cropper("destroy");
	$('#famille li',settings.modal).removeClass("active");
	$('.tab-content div',settings.modal).removeClass("active");
        $('#loading_circle',settings.modal).hide();
}

function annuler(){
	cropValidation("false");
	filtreValidation("false");
	setSelectedTraitement(null);
}

function upload(){
	$('#loading_circle',settings.modal).show();
	var canvas_rendu_final = document.createElement('canvas');
	canvas_rendu_final.width = image_modif.width;
	canvas_rendu_final.height = image_modif.height;
	canvas_rendu_final.getContext('2d').drawImage(image_modif,0,0);
       
	var url = canvas_rendu_final.toDataURL("image/"+settings.formatImageSave,1);
	var format = "";
	for(var i = 0; i < format_possible.length; i++){
		format += format_possible[i];
		if(i != format_possible.length - 1){
			format += '|';
		}
	}
	var regex = new RegExp("^data:image/("+format+");base64,");
        url = url.replace(regex,"");
	$(regex).remove();
	delete regex;
	var progression = function(evt){
		var progressBar = evt.data.progressBar;
	};
	$.ajax({
		type: 'POST',
		url: settings.urlServeur,
		data: { "imageData" : url, "formatImageSave" : settings.formatImageSave, 'imageName': settings.imageName },
		success: function(msg){
			$('#loading_circle',settings.modal).hide();
			console.log(msg);
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
			this.addSlider('brightness', 'Luminositée', -1, 1, 0, 0.1);
			this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.1);
		}, function() {
                        $('#loading_circle',settings.modal).show();
			canvas_glfx.draw(texture).brightnessContrast(this.brightness, this.contrast).update();
			if(this.flip_canvas){
				var canvas_flip = document.createElement('canvas');
				canvas_flip.height = canvas_glfx.height;
				canvas_flip.width = canvas_glfx.width;
				canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
				image_affiche.src = canvas_flip.toDataURL("image/png");
				$(canvas_flip).remove();
				delete canvas_flip;
			} else {
				image_affiche.src = canvas_glfx.toDataURL("image/png");
			}
                        $('#loading_circle',settings.modal).hide();
		}, function() {
			$('#loading_circle',settings.modal).show();
			canvas_glfx.draw(canvas_glfx.texture(image_modif)).brightnessContrast(this.brightness, this.contrast).update();
                        if(this.flip_canvas){
                                var canvas_flip = document.createElement('canvas');
                                canvas_flip.height = canvas_glfx.height;
                                canvas_flip.width = canvas_glfx.width;
                                canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
                                image_modif.src = canvas_flip.toDataURL("image/"+settings.formatImageSave,1);
                                $(canvas_flip).remove();
                                delete canvas_flip;
                        } else {
                                image_modif.src = canvas_glfx.toDataURL("image/"+settings.formatImageSave,1);
                        }
			$('#image_zone .nub',settings.modal).remove();
			$('#traitement_parametre > div',settings.modal).removeClass('active');
			$('#traitement > li',settings.modal).removeClass('active');
			$('#image_zone .nub',settings.modal).remove();
			$('#loading_circle',settings.modal).hide();
		}, flip),
		new Traitement('Hue-Saturation', 'Hue / Saturation', function() {
			this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
			this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
		}, function() {
                        $('#loading_circle',settings.modal).show();
			canvas_glfx.draw(texture).hueSaturation(this.hue, this.saturation).update();
			if(this.flip_canvas){
				var canvas_flip = document.createElement('canvas');
				canvas_flip.height = canvas_glfx.height;
				canvas_flip.width = canvas_glfx.width;
				canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
				image_affiche.src = canvas_flip.toDataURL("image/png");
				$(canvas_flip).remove();
				delete canvas_flip;
			} else {
				image_affiche.src = canvas_glfx.toDataURL("image/png");
			}
                        $('#loading_circle',settings.modal).hide();
		}, function() {
			$('#loading_circle',settings.modal).show();
			canvas_glfx.draw(canvas_glfx.texture(image_modif)).hueSaturation(this.hue, this.saturation).update();
                        if(this.flip_canvas){
                                var canvas_flip = document.createElement('canvas');
                                canvas_flip.height = canvas_glfx.height;
                                canvas_flip.width = canvas_glfx.width;
                                canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
                                image_modif.src = canvas_flip.toDataURL("image/"+settings.formatImageSave,1);
                                $(canvas_flip).remove();
                                delete canvas_flip;
                        } else {
                                image_modif.src = canvas_glfx.toDataURL("image/"+settings.formatImageSave,1);
                        }
			$('#image_zone .nub',settings.modal).remove();
			$('#traitement_parametre > div',settings.modal).removeClass('active');
			$('#traitement > li',settings.modal).removeClass('active');
			$('#image_zone .nub',settings.modal).remove();
		$('#loading_circle',settings.modal).hide();
		}, flip),
		new Traitement('Tilt-Shift', 'Tilt Shift', function() {
			this.addNub('start', 0.15, 0.75);
			this.addNub('end', 0.75, 0.6);
			this.addSlider('blurRadius', 'Radius', 0, 50, 15, 1);
			this.addSlider('gradientRadius', 'Thickness', 0, 400, 200, 1);
		}, function() {
                        $('#loading_circle',settings.modal).show();
			canvas_glfx.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
			if(this.flip_canvas){
				var canvas_flip = document.createElement('canvas');
				canvas_flip.height = canvas_glfx.height;
				canvas_flip.width = canvas_glfx.width;
				canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
				image_affiche.src = canvas_flip.toDataURL("image/png");
				$(canvas_flip).remove();
				delete canvas_flip;
			} else {
				image_affiche.src = canvas_glfx.toDataURL("image/png");
			}
                        $('#loading_circle',settings.modal).hide();
		}, function() {
			$('#loading_circle',settings.modal).show();
			canvas_glfx.draw(canvas_glfx.texture(image_modif)).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
                        if(this.flip_canvas){
                                var canvas_flip = document.createElement('canvas');
                                canvas_flip.height = canvas_glfx.height;
                                canvas_flip.width = canvas_glfx.width;
                                canvas_flip.getContext('2d').drawImage(canvas_glfx,0,0);
                                image_modif.src = canvas_flip.toDataURL("image/"+settings.formatImageSave,1);
                                $(canvas_flip).remove();
                                delete canvas_flip;
                        } else {
                                image_modif.src = canvas_glfx.toDataURL("image/"+settings.formatImageSave,1);
                        }
			$('#image_zone .nub',settings.modal).remove();
   			$('#traitement_parametre > div',settings.modal).removeClass('active');
			$('#traitement > li',settings.modal).removeClass('active');
			$('#image_zone .nub',settings.modal).remove();
			$('#loading_circle',settings.modal).hide();
		}, flip)
	];

delete flip, device;
}(jQuery));

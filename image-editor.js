(function ($){
//
//TODO ajouter préfixe aux variable (ex: ie-varibale)
//TODO ajouter progressBar pour upload
//TODO Sauvegarde grande image chromium non fonctionnelle

var script_to_load = [
	"dependence/cropper.min.js",
	"dependence/caman.full.js",
	"dependence/glfx.js"];
var devices_glfx_flip = [
	'iPad Simulator',
	'iPhone Simulator',
	'iPod Simulator',
	'iPad',
	'iPhone',
	'iPod' ];
var lang_possible = [
	"fr",
	"en"];
var format_possible = [
	'png',
	'jpeg',
	'webp'];


//Déterminer le path du script
$( "script" ).on('load', function(){
    var filename = 'image-editor';
    var scripts = document.getElementsByTagName('script');
    if (scripts && scripts.length > 0) {
        for (var i=0;i< scripts.length;i++) {
            if (scripts[i].src &&  scripts[i].src.match(new RegExp(filename+'\\.js$'))) {
		var dir = scripts[i].src.replace(new RegExp('(.*)'+filename+'\\.js$'), '$1');
		defaults.path = dir;
		break;
            }
        }
    }
});

function loadScripts(){	
	return $.Deferred(function(){
		var self = this;
		function isDone(){
			if(script_loaded == script_to_load.length){
				self.resolve();
			}
		}
		var script_loaded = 0;
		for(var i = 0; i < script_to_load.length; i++){
			$.when($.getScript(settings.path+script_to_load[i])).done(
				function(){
					script_loaded++;
					isDone();
				}
			).fail(function(){
				settings.onLoadScriptError(this.url);
			});
		}
	});
}

function getScript(url, async, done, fail){ //Principal utilité, charger en sync 
	$.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: async,
		success: done,
		error: fail
	});
	
};

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
	lang: "fr",
	maxHeight: 4096,
	maxWidth: 4096,
	modal: null,
	onUpload: function(){},
	onUploadError: function(){},
	onHide: function(){},
	onLoadImageError: function(){},
	onGlfxNoSupport: function(){alert(settings.lang.error_glfx_support_msg);},
	onLoadScriptError: function(urlScript){alert("Le scipt suivant n'a pas chargé:\n\n"+urlScript.replace(/\?.*$/, ""));},
	onLoadLangError: function(exception){alert("La langue '"+settings.lang+"' n'a pas chargé.\n\nErreur : "+exception);},
	onShow: function(){}
	};
var modifNoSave = false;
image_affiche.id = "image";

image_affiche.className = "img-responsive center-block";
image_base.className = "img-responsive center-block"; 
image_base.crossOrigin="Anonymous";
image_affiche.crossOrigin="Anonymous";
image_modif.crossOrigin="Anonymous";

var image_position = {	'screen':{'left':0,'top':0},
			'modal':{'left':0,'top':0}	} ;

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

$.fn.imageEditor = function(options, action){


	if(!action && typeof(options)=='string'){
		action = options;
		option = {};
	}else if(!action && options.urlImage && settings.modal){ //Si une image et que la modal est déjà créé
		action = 'show';
	}
	options.selector = this;
	if(action){
		switch (action){
			case 'init':
				imageEditorInit(options);
				return;
			case 'show':
				imageEditorEdit(options);
				return;
			case 'hide':
				settings.modal.modal('hide');
				return;
		}
	}
	imageEditorInit(options)

}

function imageEditorInit(options){

	if(settings.modal != null){
		return;
	}

	if(options){
		delete options.path;
	}
	settings = $.extend({},defaults,options);
	var zone = null;
	options.selector.each(function(){
		zone = $(this);
	});
	$.when(
		//quand tout les scripts sont chargé
		loadScripts()
	).done(function(){
		if(options.lang){
			for(var i = 0; i < lang_possible.length; i++){
				if(settings.lang == lang_possible[i]){
					break;
				}else if(i == lang_possible.length-1){
					settings.lang = defaults.lang;
				}
			}

		}
		getScript(settings.path + "lang/"+settings.lang+".js", false, function(data, textStatus){
				settings.lang = $.extend({}, $.fn.imageEditor.prototype.lang);
				delete $.fn.imageEditor.prototype.lang;
				initTraitements()
			},
			function(jqxhr, setting, exception){
				settings.onLoadLangError(exception);
				return;
			}
		);

		$(document).ready(function(){

			try {
				canvas_glfx = fx.canvas();
			} catch (e) {
				settings.onGlfxNoSupport();
				return;
			}

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
			$('<div />').attr({class: 'modal-body'}).text(settings.lang.error_msg).appendTo(content);
			var footer = $('<div />').attr({class: 'modal-footer'}).appendTo(content)
			$('<button />').attr({'data-dismiss': 'modal'}).text('close').appendTo(footer);
			
			settings.modal.on('hidden.bs.modal', settings.onHide);

		});
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

//$.fn.editImage = function(options){
function imageEditorEdit(options){


	if(settings.modal == null) return;

	delete options.modal, options.path, options.lang;
	settings = $.extend({}, defaults, settings, options);
	if(settings.maxHeight > defaults.maxHeight){
		settings.maxHeight = defaults.maxHeight;
	}
	if(settings.maxWidth > defaults.maxWidth){
		settings.maxWidth = defaults.maxHeight;
	}

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
	if(settings.formatImageSave == 'png'){
		image_affiche.style.background = "url("+settings.path+"dependence/background.png) repeat";
	}else{
		image_affiche.style.background = "black";
	}
	settings.modal.modal({keyboard: false}).load(settings.path+'image-editor.html'+'?'+(new Date().getTime()), function(e){
		$('#image_zone',settings.modal).empty().html('<p class="text-center">'+settings.lang.loading_image_msg+'</p>');
		$('.modal-title', settings.modal).text(settings.lang.title+' - '+settings.imageName+'.'+settings.formatImageSave);
		$('#loading_circle', settings.modal).attr({src: settings.path+'/dependence/loading_circle.gif'});
		$('#famille li',settings.modal).removeClass("active");
		$('.tab-content div',settings.modal).removeClass("active");
		$('#loading_circle',settings.modal).show();
		$('#image_url',settings.modal).empty();
		image_affiche.onload = function () { //premier chargement de l'image affichée
			$('#image_zone',settings.modal).empty().append(image_affiche);
			$('#loading_circle',settings.modal).hide();
			reset();
			image_affiche.onload = null;
			resizeCanvasImage(image_modif, canvas_traitement, settings.maxWidth, settings.maxHeight);
			image_modif.src = canvas_traitement.toDataURL('image/'+settings.formatImageSave,1);
			$(canvas_traitement).remove();
			canvas_traitement = document.createElement('canvas');
		};

		image_modif.onload = function(){

			ratio_image = resizeCanvasImage(image_modif, canvas_traitement, 550,550);
			image_affiche.src = canvas_traitement.toDataURL("image/png");

			canvas_glfx.height = canvas_traitement.height;
			canvas_glfx.width = canvas_traitement.width;
			texture = canvas_glfx.texture(canvas_traitement);
		};

		var erreur = function () {
			$('#image_zone',settings.modal).empty().html('<p class="text-center">'+settings.lang.error_loading_image_msg+'('+settings.urlImage+').</p>');
			$('#loading_circle',settings.modal).hide();
			settings.onLoadImageError();
		}
		image_base.onerror = erreur;
		image_affiche.onerror = erreur;

		image_base.src = settings.urlImage; //"image/unnamed3.jpg";
		image_modif.src = settings.urlImage;
		$('#li_crop',settings.modal).on('click',function(){annuler();crop();}).text(settings.lang.crop);
		$('#li_filtre',settings.modal).on('click',function(){annuler()}).text(settings.lang.filters);
		$('#li_traitement',settings.modal).on('click',function(){annuler()}).text(settings.lang.image_process);
		$('#li_comparer',settings.modal).on('click',function(){$("#image_zone #image",settings.modal).cropper('destroy');affiche_base();}).text(settings.lang.compare);
		$('#li_reset',settings.modal).on('click',function(){annuler();reset()}).text(settings.lang.reset);

		$('#crop button',settings.modal).on('click',function(){cropValidation(this.value)});
		$('#crop #valider',settings.modal).text(settings.lang.validate_button);
		$('#crop #annuler',settings.modal).text(settings.lang.cancel_button);


		//button close
		var quit_validate = $('<div/>').appendTo('.modal-footer',settings.modal).hide().append('<p>'+settings.lang.close_msg+'</p>');
		$('<button/>').attr({class:'btn btn-success'}).text(settings.lang.cancel_button).appendTo(quit_validate);
		$('<button/>').attr({class:'btn btn-danger'}).text(settings.lang.close_button).appendTo(quit_validate).on('click',function(){
			settings.modal.modal('hide');
		});

		var button_close = $('<button/>').attr({
			type:'button',
			class:'btn btn-danger',
			id:'close_do_popover',
			role:'button'})
		.text(settings.lang.close_button)
		.prependTo('.modal-footer #button-action',settings.modal)
		.on('click',{quit_validate:quit_validate}, function(event){

			if(settings.urlServeur && modifNoSave == true){
			//	$(this).popover('show');
				$(event.data.quit_validate).show();
				$(this).parent().hide();
			}else{
				settings.modal.modal('hide');
			}
		})

		$('button', quit_validate).on('click',{quit_validate:quit_validate},function(event){
			$(event.data.quit_validate).hide();
			$('.modal-footer #button-action').show();
		});


		//button save
		$('<button />').attr({class:'btn btn-success',type:'button'})
		.on('click',download)
		.text(settings.lang.download_button)
		.prependTo('.modal-footer #button-action',settings.modal);
		
		//button d'upload
		if(settings.urlServeur != null){
			$('<button />').attr({id:'upload', type:'button', class: 'btn'})
			.text(settings.lang.upload_button)
			.on('click',upload)
			.prependTo('.modal-footer #button-action', settings.modal);
		}

		settings.onShow();
	});

}

function download() {
	var a = document.createElement('a')
	a.download = settings.imageName +'.'+settings.formatImageSave;
	a.href = image_modif.src;
	document.body.appendChild(a);
	a.click();
	a.remove();
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
		Caman(canvaformatImageSaves_traitement, function(){
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
			modifNoSave = true;
		});
	});
}

function slider_change(slider, traitement, value){
	traitement[slider.id] = parseFloat(value);
	traitement.update();
}

function reset(){
	modifNoSave = false;
	$('#loading_circle',settings.modal).show();
	$('#filtre',settings.modal).empty();
	$('#filtre_zone #validation',settings.modal).empty();
	$('#traitement_zone',settings.modal).empty();
	$(canvas_traitement).remove();
	delete canvas_traitement;
	canvas_traitement = document.createElement('canvas');
	canvas_traitement.height = image_affiche.height;
	canvas_traitement.width = image_affiche.width;
	$(canvas_glfx).remove();
	delete canvas_glfx;
	canvas_glfx = fx.canvas();
	canvas_glfx.height = image_affiche.height;
	canvas_glfx.width = image_affiche.width;
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
	.text(settings.lang.validate_button)
	.appendTo('#filtre_zone #validation',settings.modal)
	.on('click',function(){filtreValidation(this.value)});

	$('<button />').attr({id:"annuler", type:"button", value:"false", class:"btn"})
	.text(settings.lang.cancel_button)
	.appendTo('#filtre_zone #validation',settings.modal)
	.on('click',function(){filtreValidation(this.value)})
	.parent().hide();
        ///////////
        //  Traitements
        /////////
	$('<div />').attr({id:"traitement", class:"center-block"}).appendTo('#traitement_zone',settings.modal);
	$('<div />').attr({id:"traitement_parametre", class:"tab-content"}).appendTo('#traitement_zone',settings.modal);
       for(var i = 0; i < traitements.length; i++){
		var traitement = traitements[i];
		
		$('<button />').attr({'data-toggle':"tab", href:'#'+traitement.id, class:'btn'})
		.text(traitement.label)
		.on('click',{traitement:traitement},function(event){
			var traitement = event.data.traitement;
			setSelectedTraitement(traitement);
		})
		.appendTo('#traitement',settings.modal);

		var div_traitement = $('<div />').attr({id:traitement.id, class:"row center-block tab-pane fade in table-responsive"}).appendTo('#traitement_parametre',settings.modal);
		$('<p/>').text(traitement.label).attr({style:'text-align: center;'}).appendTo(div_traitement);

                /////////
                //  Sliders
                ///////// 
		if(traitement.sliders.length){
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
                        }).on('input',{slider:slider,traitement:traitement},function(event){
				slider_change(event.data.slider, event.data.traitement, $(this).val())   
			})
                        .on('change',{slider:slider,traitement:traitement},function(event){
				slider_change(event.data.slider, event.data.traitement, $(this).val())
			})
			.appendTo(th);
                }


		//////////
		//  Valider/Annuler
		//////////
		$('<button />').attr({id:"valider", type:"button", value:"true", class:"btn"})
		.text(settings.lang.validate_button)
		.appendTo('#'+traitement.id,settings.modal)
		.on('click',{traitement:traitement},function(event){
			event.data.traitement.validate();
		});
		$('<button />').attr({id:"annuler", type:"button", value:"false", class:"btn"})
		.text(settings.lang.cancel_button)
		.appendTo('#'+traitement.id,settings.modal)
		.on('click',function(){setSelectedTraitement(null)});
        

	        /////////
                //  Nubs (position sur l'image)
                /////////
		var nub_present = false;
		for (var j = 0; j < traitement.nubs.length; j++) {
			var nub = traitement.nubs[j];
			var x = nub.x * canvas_glfx.width;
			var y = nub.y * canvas_glfx.height;
			traitement[nub.id] = { x: x, y: y, reel_x: x/ratio_image, reel_y: y/ratio_image};
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

function setSelectedTraitement(traitement){
	modifNoSave = false;
	$(window).off('resize', window, actualisePos);
	$(window).off('orientationchange', window, actualisePos);
	$('#image_zone .nub',settings.modal).remove();
	$('#traitement_parametre > div',settings.modal).removeClass('active');
	image_affiche.src = canvas_traitement.toDataURL('image/png');
	if(traitement == null){
		$('#traitement_parametre',settings.modal).hide();
		$('#traitement',settings.modal).show();
		return;
	}
	$('#'+traitement.id,settings.modal).addClass('active');
	$('#traitement_parametre',settings.modal).show();
	$('#traitement',settings.modal).hide();

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

			traitement[nub.id] = { x: x, y: y, reel_x: x/ratio_image, reel_y: y/ratio_image };

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
			traitement[nub.id] = { x: x, y: y, reel_x: x/ratio_image, reel_y: y/ratio_image};
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
		traitement[nub.id] = { x: x, y: y, reel_x: x/ratio_image, reel_y: y/ratio_image};
	}
	traitement.update();
}

function crop(){// JCrop
	$('#loading_circle',settings.modal).show();
	$('#image_zone #image',settings.modal).cropper();
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

		modifNoSave = true;
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
			settings.onUpload(msg);
			console.log(msg);
			modifNoSave = false;
		},
		error: function(msg){
			settings.onUploadError(msg);
		}
	});

		delete canvas_rendu_final;
	}

////////////////////
//	GLFX	  //
////////////////////

function Traitement(id, init, update, validate,flip_canvas, reset, label){
	if(typeof(label)!='string'){
		if(settings.lang[id]){
			label = settings.lang[id];
		}else{
			label = id;
		}
	}
	this.label = label;
	this.id = id;
	this.update = update;
	this.reset = reset;
	this.sliders = [];
	this.nubs = [];
	this.flip_canvas = flip_canvas;
	this.validate = validate;
	init.call(this);
}

Traitement.prototype.addSlider = function(id,min,max,value,step,label){
	if(typeof(label)!='string'){
		if(settings.lang[id]){
			label = settings.lang[id];
		}else{
			label = id;
		}
	}
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

function applyPreview(traitement){
	if(traitement.flip_canvas){
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
}

function applyReal(traitement){
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
	modifNoSave = true;
	$('#traitement_parametre',settings.modal).hide();
	$('#traitement',settings.modal).show();
	$(window).off('resize');
	$(window).off('orientationchange');
	$('#image_zone .nub',settings.modal).remove();
	$('#traitement_parametre > div',settings.modal).removeClass('active');
}

var traitement = null
function initTraitements(){
	traitements = [
			new Traitement('brightnessContrast', function(){
				this.addSlider('brightness',-1, 1, 0, 0.1);
				this.addSlider('contrast',-1, 1, 0, 0.1);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).brightnessContrast(this.brightness, this.contrast).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).brightnessContrast(this.brightness, this.contrast).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('hueSaturation', function() {
				this.addSlider('hue', -1, 1, 0, 0.01);
				this.addSlider('saturation', -1, 1, 0, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).hueSaturation(this.hue, this.saturation).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).hueSaturation(this.hue, this.saturation).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('vibrance', function() {
				this.addSlider('amount', -1, 1, 0, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).vibrance(this.amount).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).vibrance(this.amount).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('denoise', function() {
				this.addSlider('exponent', 0,50,20,1);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).denoise(this.exponent).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).denoise(this.exponent).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('unsharpMask', function() {
				this.addSlider('radius', 0,200,20,1);
				this.addSlider('strength', 0,5,2,0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).unsharpMask(this.radius, this.strength).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).unsharpMask(this.radius, this.strength).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('noise', function() {
				this.addSlider('amount', 0,1,0.5,0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).noise(this.amount).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).noise(this.amount).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('sepia', function() {
				this.addSlider('amount', 0,1,1,0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).sepia(this.amount).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).sepia(this.amount).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('vignette', function() {
				this.addSlider('amount', 0,1,0.5,0.01);
				this.addSlider('size', 0,1,0.5,0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).vignette(this.size,this.amount).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).vignette(this.size,this.amount).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	//////////////////////////////////////////////////////
			new Traitement('zoomBlur', function() {
				this.addNub('center', 0.5,0.5);
				this.addSlider('strength', 0, 1, 0.3, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).zoomBlur(this.center.x,this.center.y,this.strength).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).zoomBlur(this.center.reel_x,this.center.reel_y,this.strength).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('tiltShift', function() {
				this.addNub('start', 0.15, 0.75);
				this.addNub('end', 0.75, 0.6);
				this.addSlider('blurRadius', 0, 50, 15, 1);
				this.addSlider('gradientRadius', 0, 400, 200, 1);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).tiltShift(this.start.reel_x, this.start.reel_y, this.end.reel_x, this.end.reel_y, this.blurRadius, this.gradientRadius).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('triangleBlur', function() {
				this.addSlider('radius', 0, 200, 50, 1);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).triangleBlur(this.radius).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).triangleBlur(this.radius).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('lensBlur', function() {
				this.addSlider('radius', 0, 50, 10, 1);
				this.addSlider('brightness', -1, 1, 0.75, 0.01);
				this.addSlider('angle', -Math.PI, Math.PI, 0, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).lensBlur(this.radius,this.brightness,this.angle).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).lensBlur(this.radius,this.brightness,this.angle).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('swirl', function() {
				this.addSlider('radius', 0, 600, 200, 1);
				this.addSlider('angle',-25, 25, 3, 0.1);
				this.addNub('center', 0.5,0.5);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).swirl(this.center.x,this.center.y,this.radius,this.angle).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).swirl(this.center.reel_x,this.center.reel_y,this.radius,this.angle).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('bulgePinch', function() {
				this.addSlider('radius', 0, 600, 200, 1);
				this.addSlider('strength',-1, 1, 0.5, 0.01);
				this.addNub('center', 0.5,0.5);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).bulgePinch(this.center.x,this.center.y,this.radius,this.strength).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).bulgePinch(this.center.reel_x,this.center.reel_y,this.radius,this.strength).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('perspective', function() {
				this.addNub('a', 0.25,0.25);
				this.addNub('b', 0.75,0.25);
				this.addNub('c', 0.25,0.75);
				this.addNub('d', 0.75,0.75);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				this.after = [this.a.x,this.a.y,this.b.x,this.b.y,this.c.x,this.c.y,this.d.x,this.d.y];
				this.before = [0,0,image_affiche.width, 0,0,image_affiche.height,image_affiche.width,image_affiche.height];
				canvas_glfx.draw(texture).perspective(this.before, this.after).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				this.before = [0,0,image_modif.width, 0,0,image_modif.height,image_modif.width,image_modif.height];
				this.after = [this.a.reel_x,this.a.reel_y,this.b.reel_x,this.b.reel_y,this.c.reel_x,this.c.reel_y,this.d.reel_x,this.d.reel_y];
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).perspective(this.before, this.after).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('ink', function() {
				this.addSlider('strength', 0, 1, 0.25, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).ink(this.strength).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).ink(this.strength).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('edgeWork', function() {
				this.addSlider('radius', 0, 200, 10, 1);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).edgeWork(this.radius).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).edgeWork(this.radius).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('hexagonalPixelate', function() {
				this.addNub('center', 0.5, 0.5);
				this.addSlider('scale', 10, 100, 20, 1);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).hexagonalPixelate(this.center.x,this.center.y,this.scale).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).hexagonalPixelate(this.center.reel_x,this.center.reel_y,this.scale).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('dotScreen', function() {
				this.addNub('center', 0.5, 0.5);
				this.addSlider('angle', 0, Math.PI/2, 1.1, 0.01);
				this.addSlider('size', 3, 20, 3, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).dotScreen(this.center.x,this.center.y,this.angle,this.size).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).dotScreen(this.center.reel_x,this.center.reel_y,this.angle,this.size).update();
				applyReal(this);
				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
	/////////////////////////////////////////////////////
			new Traitement('colorHalftone', function() {
				this.addNub('center', 0.5, 0.5);
				this.addSlider('angle', 0, Math.PI/2, 0.25, 0.01);
				this.addSlider('size', 3, 20, 4, 0.01);
			}, function() {
				///	PREVIEW
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(texture).colorHalftone(this.center.x,this.center.y,this.angle,this.size).update();
				applyPreview(this);
				$('#loading_circle',settings.modal).hide();
			}, function() {
				///	REAL	
				$('#loading_circle',settings.modal).show();
				canvas_glfx.draw(canvas_glfx.texture(image_modif)).colorHalftone(this.center.reel_x,this.center.reel_y,this.angle,this.size).update();
				applyReal(this);;

				$('#loading_circle',settings.modal).hide();
			}, flip
			,null
			,null),
		];
}

delete flip, device;
}(jQuery));

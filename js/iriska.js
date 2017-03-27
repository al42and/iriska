function el(id){return document.getElementById(id);} // Get elem by ID

open_post = function(verb, url, data, target) {
    var form = document.createElement('form');
    form.action = url;
    form.method = verb;
    form.enctype = 'multipart/form-data';
    form.target = target || '_self';
    if (data) {
        for (var key in data) {
            var input = document.createElement('input');
            //console.log(key + ' - ' + data[key] + ' - ' + JSON.stringify(data[key]));
            input.type = 'hidden';
            input.name = key;
            input.value = data[key];
            form.appendChild(input);
        }
    }
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
};

searchGoogle = function (b64) {
    var safeB64 = b64.replace(/\//g,'_').replace(/\+/g,'-');
    var formData = {
        image_url: null,
        image_content: safeB64,
        filename: 'cropped.png',
        hl: 'en',
        encoded_image: null
    };
    open_post('POST', 'https://www.google.com/searchbyimage/upload', formData, '_blank');
};

function startSearch(cropper){
    var b64Text = cropper.getCroppedCanvas().toDataURL('image/png');
    //window.open(b64Text, "_blank");
    b64Text = b64Text.replace('data:image/png;base64,','');
    searchGoogle(b64Text);
}

window.onload = function () {
    'use strict';

    var Cropper = window.Cropper;
    var URL = window.URL || window.webkitURL;
    var image = el('image');
    var search_button = el('search_button');

    var options = {
        autoCrop: false,
        guides: false,
        cropend: function () {
            if (el('search_auto').checked) {
                startSearch(cropper);
            }
        }
    };

    var cropper = new Cropper(image, options);
    var originalImageURL = image.src;
    var uploadedImageURL;

    // Import image
    var inputImage = el('inputImage');

    search_button.onclick = function(){
        startSearch(cropper);
    };
    
    if (URL) {
        inputImage.onchange = function () {
            var files = this.files;
            var file;

            if (cropper && files && files.length) {
                file = files[0];

                if (/^image\/\w+/.test(file.type)) {
                    if (uploadedImageURL) {
                        URL.revokeObjectURL(uploadedImageURL);
                    }

                    image.src = uploadedImageURL = URL.createObjectURL(file);
                    cropper.destroy();
                    cropper = new Cropper(image, options);
                    inputImage.value = null;
                } else {
                    window.alert('Please choose an image file.');
                }
            }
        };
    } else {
        inputImage.disabled = true;
        inputImage.parentNode.className += ' disabled';
    }

    document.body.onkeydown = function (event) {
        var e = event || window.event;

        if (!cropper) {
            return;
        }

        switch (e.keyCode) {
            // Use http://keycode.info/ for help
            case 13: // Enter
                e.preventDefault();
                startSearch(cropper);
                break;
        }
    };
};

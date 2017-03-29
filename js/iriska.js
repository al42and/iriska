/*jslint browser: true*/
/*global window*/

function el(id){return document.getElementById(id);} // Get elem by ID

function openPost(verb, url, data, target) {
    "use strict";
    var form = document.createElement("form");
    form.action = url;
    form.method = verb;
    form.enctype = "multipart/form-data";
    form.target = target || "_self";
    if (data) {
        Object.keys(data).forEach(function (key) {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = data[key];
            form.appendChild(input);
        });
    }
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
}

function searchGoogle(b64) {
    "use strict";
    var safeB64 = b64.replace(/\//g, "_").replace(/[+]/g, "-");
    var formData = {
        image_url: null,
        image_content: safeB64,
        filename: "cropped.png",
        hl: "en",
        encoded_image: null
    };
    openPost("POST", "https://www.google.com/searchbyimage/upload", formData, "_blank");
}

function startSearch(cropper) {
    "use strict";
    var b64Text = cropper.getCroppedCanvas({}).toDataURL("image/png");
    b64Text = b64Text.replace("data:image/png;base64,", "");
    searchGoogle(b64Text);
}

window.onload = function () {
    "use strict";

    var Cropper = window.Cropper;
    var URL = window.URL || window.webkitURL;
    var image = el("image");
    var searchButton = el("search_button");
    var resetButton = el("reset_button");
    var rotateSlider = el("rotate_slider");
    var inputImage = el("inputImage");

    var uploadedImageURL;
    var cropper;

    var options = {
        autoCrop: false,
        guides: false,
        cropend: function () {
            if (el("search_auto").checked) {
                startSearch(cropper);
            }
        }
    };

    cropper = new Cropper(image, options);

    searchButton.onclick = function () {
        startSearch(cropper);
    };

    resetButton.onclick = function() {
        cropper.reset();
        rotateSlider.value = 0;
    };

    rotateSlider.value = 0;
    rotateSlider.onchange = function () {
        cropper.rotateTo(rotateSlider.value);
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

                    uploadedImageURL = URL.createObjectURL(file);
                    image.src = uploadedImageURL;
                    cropper.destroy();
                    cropper = new Cropper(image, options);
                    inputImage.value = null;
                } else {
                    window.alert("Please choose an image file.");
                }
            }
        };
    } else {
        inputImage.disabled = true;
        inputImage.parentNode.className += " disabled";
    }

    document.body.onkeydown = function (event) {
        var e = event || window.event;

        if (!cropper) {
            return;
        }

        // Use http://keycode.info/ for help
        switch (e.keyCode) {
            case 13: // Enter
                e.preventDefault();
                startSearch(cropper);
                break;
        }
    };
};

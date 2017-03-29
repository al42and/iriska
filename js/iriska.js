/*jslint browser: true*/
/*global window,piexif*/

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

function processGpsCoord(value, letter) {
    "use strict";
    var split = (value + '').split(",");
    var result = value;
    var hours = 0, minutes = 0, seconds = 0;
    if (split.length > 0 && split.length % 2 == 0) {
        if (split.length >= 2) {
            hours = split[0] / split[1];
        }
        if (split.length >= 4) {
            minutes = split[2] / split[3];
        }
        if (split.length >= 6) {
            seconds = split[4] / split[5];
        }
        result = hours + minutes / 60.0 + seconds / 3600.0;
        if (letter === "W" || letter === "S") {
            result *= -1;
        }
        result = result.toFixed(8);
    }
    return result;
}

function showExifData(file, whereTo) {
    "use strict";
    var reader = new FileReader();
    var lat = null, long = null, lat_letter = null, long_letter = null;
    var hasGPS = false;
    reader.onloadend = function(e) {
        var exifObj = piexif.load(e.target.result);
        var text = "";
        Object.keys(exifObj).forEach(function (ifd) {
            if (ifd !== "thumbnail") {
                Object.keys(exifObj[ifd]).forEach(function (tag) {
                    var tagName = piexif.TAGS[ifd][tag].name;
                    var tagValue = exifObj[ifd][tag];
                    switch (tagName) {
                        case "GPSLatitude":
                            lat = processGpsCoord(tagValue);
                            hasGPS = true;
                            break;
                        case "GPSLongitude":
                            long = processGpsCoord(tagValue);
                            hasGPS = true;
                            break;
                        case "GPSLatitudeRef":
                            lat_letter = tagValue;
                            hasGPS = true;
                            break;
                        case "GPSLongitudeRef":
                            long_letter = tagValue;
                            hasGPS = true;
                            break;
                    }
                });
            }
        });
        if (lat && long && lat_letter && long_letter) {
            lat = processGpsCoord(lat, lat_letter);
            long = processGpsCoord(long, long_letter);
            text = "<p class=\"text-warning\">В картинке есть GPS-данные: LAT, LONG. <a href='https://www.google.ru/maps/search/LAT,LONG' target='_blank'>Google</a>, <a href='https://yandex.ru/maps/?ll=LONG,LAT&pt=LONG,LAT&spn=0.02,0.02' target='_blank'>Яндекс</p>";
            text = text.replace(/LAT/g, lat).replace(/LONG/g, long);
        } else if (hasGPS) {
            text = "<p class=\"text-warning\">В картинке, похоже, есть GPS-данные, но я их не могу распарсить</p>";
        } else {
            text = "<p>В картинке GPS-данных не обнаружено</p>";
        }
        whereTo.innerHTML = text;
    };
    reader.readAsDataURL(file);
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
        var cropBox = cropper.getCropBoxData();
        cropper.reset();
        cropper.setCropBoxData(cropBox);
        rotateSlider.value = 0;
    };

    rotateSlider.value = 0;
    rotateSlider.onchange = function () {
        cropper.rotateTo(rotateSlider.value);
    };
    // Continuously update image angle
    rotateSlider.onmousemove = rotateSlider.onchange;


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

                    showExifData(file, el("exif-data"));
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

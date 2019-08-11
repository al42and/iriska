/*jslint browser: true*/
/*global window,piexif*/

function el(id){
    return document.getElementById(id);
} // Get elem by ID

function openPost(verb, url, data, target) {
    "use strict";
    let form = document.createElement("form");
    form.action = url;
    form.method = verb;
    form.enctype = "multipart/form-data";
    form.target = target || "_self";
    if (data) {
        Object.keys(data).forEach(function (key) {
            let input = document.createElement("input");
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

function searchGoogle(b64, target) {
    "use strict";
    const safeB64 = b64.replace(/\//g, "_").replace(/[+]/g, "-");
    const formData = {
        image_url: null,
        image_content: safeB64,
        filename: "cropped.jpeg",
        hl: "en",
        encoded_image: null
    };
    openPost("POST", "https://www.google.com/searchbyimage/upload", formData, target);
}

function getCroppedData(cropper) {
    "use strict";
    const b64Text = cropper.getCroppedCanvas({}).toDataURL("image/jpeg");
    return b64Text.replace("data:image/jpeg;base64,", "");
}

function startSearch(cropper, target) {
    "use strict";
    searchGoogle(getCroppedData(cropper), target || "_blank");
}

// GPS
function processGpsCoord(value, letter) {
    "use strict";
    const split = (value + '').split(",");
    let result = value;
    let hours = 0, minutes = 0, seconds = 0;
    if (split.length > 0 && split.length % 2 === 0) {
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
    let reader = new FileReader();
    let lat = null, long = null, latLetter = null, longLetter = null;
    let hasGPS = false;
    reader.onloadend = function(e) {
       const exifObj = piexif.load(e.target.result);
        let text = "";
        Object.keys(exifObj).forEach(function (ifd) {
            if (ifd !== "thumbnail") {
                Object.keys(exifObj[ifd]).forEach(function (tag) {
                    var tagName = piexif.TAGS[ifd][tag].name;
                    var tagValue = exifObj[ifd][tag];
                    switch (tagName) {
                        case "GPSLatitude":
                            lat = tagValue;
                            hasGPS = true;
                            break;
                        case "GPSLongitude":
                            long = tagValue;
                            hasGPS = true;
                            break;
                        case "GPSLatitudeRef":
                            latLetter = tagValue;
                            hasGPS = true;
                            break;
                        case "GPSLongitudeRef":
                            longLetter = tagValue;
                            hasGPS = true;
                            break;
                    }
                });
            }
        });
        if (lat && long && latLetter && longLetter) {
            lat = processGpsCoord(lat, latLetter);
            long = processGpsCoord(long, longLetter);
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

    const Cropper = window.Cropper;
    const URL = window.URL || window.webkitURL;
    const selfHash = new URL(window.location).hash.replace("#","");
    const image = el("image");
    const searchButton = el("search_button");
    const resetButton = el("reset_button");
    const rotateSlider = el("rotate_slider");
    const inputImage = el("inputImage");
    const imageContainer = el("imageContainer");

    let uploadedImageURL;
    let cookieValue;
    let cropper;
    let updateImage;

    // Cropper options
    const options = {
        autoCrop: false,
        guides: false,
        cropend: function () {
            if (el("search_auto").checked) {
                startSearch(cropper);
            }
        }
    };

    // Redirect to search if we've been opened in background
    if (selfHash.length > 0) {
        cookieValue = window.localStorage.getItem(selfHash);
        if (cookieValue && cookieValue.length > 0) {
            window.localStorage.removeItem(selfHash);
            searchGoogle(cookieValue, "_self");
        } else {
            el("exif-data").innerHTML = "<p class=\"text-warning\">Не могу начать поиск в фоновой вкладке; вероятно, картинка слишком большая</p>";
        }
    }

    cropper = new Cropper(image, options);

    // Image search button left click
    searchButton.onclick = function (event) {
        const e = event || window.event;
        if (e.button === 0) {
            searchButton.target = "_blank";
            startSearch(cropper);
            e.preventDefault();
        }
    };

    // Image search button middle click
    document.onclick = function (event) {
        const e = event || window.event;
        let newId;
        if (e.target === searchButton) {
            if (e.button === 1) {
                // window.localStorage.clear(); // TODO: ?
                newId = 'storage' + (new Date()).valueOf();
                window.localStorage.setItem(newId, getCroppedData(cropper));
                searchButton.href = '#' + newId;
            }
        }
    };

    // Image orientation
    resetButton.onclick = function() {
        let cropBox = cropper.getCropBoxData();
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

    updateImage = function (files) {
        let file;

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

    // File drag&drop
    imageContainer.ondrop = function (event) {
        const files = event.dataTransfer.files;
        event.stopPropagation();
        event.preventDefault();
        console.log(files);
        if (files.length > 0) {
            updateImage(files);
        }
    };
    imageContainer.ondragenter = function (event) {
        event.stopPropagation();
        event.preventDefault();
    };
    imageContainer.ondragover = function (event) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    // On new file
    if (URL) {
        inputImage.onchange = function () {
            updateImage(this.files);
        };
    } else {
        inputImage.disabled = true;
        inputImage.parentNode.className += " disabled";
    }

    document.body.onkeydown = function (event) {
        const e = event || window.event;

        if (!cropper) {
            return;
        }

        // Use http://keycode.info/ for help
        if (e.keyCode == 13) {  // Pressed "Enter"
                e.preventDefault();
                startSearch(cropper);
        }
    };
};

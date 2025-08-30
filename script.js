document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadArea = document.getElementById('upload-area');
    const fileInputLabel = document.querySelector('.file-input-label');
    const fileInput = document.getElementById('file-input');
    const errorMessage = document.getElementById('error-message');
    const dismissError = document.getElementById('dismiss-error');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');
    const originalSizeText = document.getElementById('original-size');
    const scaledSizeText = document.getElementById('scaled-size');
    const sliceCountText = document.getElementById('slice-count');
    const sliceResolutionText = document.getElementById('slice-resolution');
    const highResToggle = document.getElementById('high-res-toggle');
    const aspectRatioSelect = document.getElementById('aspect-ratio');
    const processBtn = document.getElementById('process-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultContainer = document.getElementById('result-container');
    const slicesPreview = document.getElementById('slices-preview');
    const downloadBtn = document.getElementById('download-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    const navButtons = document.querySelectorAll('.mode-selector .mode-btn');
    const blurSlider = document.getElementById('blur-slider');
    const colorSwatches = document.getElementById('color-swatches');
    const colorPicker = document.getElementById('color-picker');
    const gradientTypeSelect = document.getElementById('gradient-type');
    const gradientAngleInput = document.getElementById('gradient-angle');
    const videoDuration = document.getElementById('video-duration');
    const durationValue = document.getElementById('duration-value');
    const videoFps = document.getElementById('video-fps');
    const fpsValue = document.getElementById('fps-value');
    const videoBitrate = document.getElementById('video-bitrate');
    const bitrateValue = document.getElementById('bitrate-value');
    const easingSelect = document.getElementById('video-easing');
    const directionButtons = document.querySelectorAll('#pan-direction .dir-btn');
    const formatButtons = document.querySelectorAll('#video-format .fmt-btn');
    const generateVideoBtn = document.getElementById('generate-video');
    const videoResult = document.getElementById('video-result');
    const watermarkType = document.getElementById('wm-type');
    const wmTextInput = document.getElementById('wm-text');
    const wmFontSize = document.getElementById('wm-font-size');
    const wmFontWeight = document.getElementById('wm-font-weight');
    const wmColor = document.getElementById('wm-color');
    const wmStrokeColor = document.getElementById('wm-stroke-color');
    const wmStrokeWidth = document.getElementById('wm-stroke-width');
    const wmImageInput = document.getElementById('wm-image');
    const wmOpacity = document.getElementById('wm-opacity');
    const wmOpacityValue = document.getElementById('wm-opacity-value');
    const wmPositionButtons = document.querySelectorAll('#wm-position-grid .pos-btn');
    const wmOffsetX = document.getElementById('wm-offset-x');
    const wmOffsetY = document.getElementById('wm-offset-y');
    const textWatermarkOptions = document.getElementById('text-watermark-options');
    const imageWatermarkOptions = document.getElementById('image-watermark-options');

    // Disable actions until a valid image is loaded
    processBtn.disabled = true;
    downloadBtn.disabled = true;
    if (generateVideoBtn) generateVideoBtn.disabled = true;
    
    // Variables to store image data
    let originalImage = null;
    let slicedImages = [];
    let fullViewImage = null;
    let palette = [];
    let backgroundSettings = {
        mode: 'original',
        blur: 20,
        color: '#ffffff',
        gradientType: 'linear',
        gradientAngle: 0,
        gradientColors: []
    };
    let lastSliceWidth = 0;
    let lastSliceHeight = 0;
    let panDirection = 'ltr';
    let outputFormat = 'mp4';
    let currentVideoUrl = null;
    let watermarkSettings = {
        type: 'none',
        text: '',
        fontSize: 24,
        fontWeight: 'normal',
        color: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 0,
        image: null,
        opacity: 1,
        position: 'bottom-right',
        offsetX: 0,
        offsetY: 0
    };
    
    // Aspect ratio (width:height)
    let aspectRatio = 4 / 5;

    // Standard resolution (for standard mode)
    const standardWidth = 1080;
    function getStandardHeight() {
        return Math.round(standardWidth / aspectRatio);
    }
    
    const minSlices = 2;
    // Show loading overlay with custom message
    function showLoading(message) {
        loadingText.textContent = message;
        loadingOverlay.classList.add('active');
    }
    
    // Hide loading overlay
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }
    
    // Show button loading state
    function showButtonLoading(button) {
        button.disabled = true;
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Processing...';
    }
    
    // Hide button loading state
    function hideButtonLoading(button, originalText) {
        button.disabled = false;
        button.innerHTML = originalText;
    }

    function debounce(fn, delay = 16) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    function updateBgOptionVisibility() {
        document.querySelectorAll('.bg-option').forEach(opt => {
            if (opt.id === `${backgroundSettings.mode}-options`) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
    }

    function renderPalette(colors) {
        colorSwatches.innerHTML = '';
        colors.forEach(c => {
            const sw = document.createElement('button');
            sw.className = 'color-swatch';
            sw.style.backgroundColor = c;
            sw.dataset.color = c;
            colorSwatches.appendChild(sw);
        });
    }

    function extractPalette(img, count = 5) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const pixels = [];
        const step = 4 * 10;
        for (let i = 0; i < data.length; i += step) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a > 0) pixels.push([r, g, b]);
        }
        if (pixels.length === 0) return [];

        const centroids = [];
        for (let i = 0; i < count; i++) {
            centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
        }

        for (let iter = 0; iter < 5; iter++) {
            const clusters = Array.from({ length: count }, () => ({ sum: [0,0,0], count: 0 }));
            pixels.forEach(p => {
                let best = 0;
                let bestDist = Infinity;
                centroids.forEach((c, idx) => {
                    const dist = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2;
                    if (dist < bestDist) { bestDist = dist; best = idx; }
                });
                const cl = clusters[best];
                cl.sum[0] += p[0];
                cl.sum[1] += p[1];
                cl.sum[2] += p[2];
                cl.count++;
            });
            centroids.forEach((c, idx) => {
                const cl = clusters[idx];
                if (cl.count > 0) {
                    c[0] = Math.round(cl.sum[0] / cl.count);
                    c[1] = Math.round(cl.sum[1] / cl.count);
                    c[2] = Math.round(cl.sum[2] / cl.count);
                }
            });
        }

        return centroids.map(c => `#${((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1)}`);
    }

    function drawWatermark(ctx, width, height) {
        if (watermarkSettings.type === 'text' && watermarkSettings.text) {
            ctx.save();
            ctx.globalAlpha = watermarkSettings.opacity;
            ctx.font = `${watermarkSettings.fontWeight} ${watermarkSettings.fontSize}px Montserrat, sans-serif`;
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            const metrics = ctx.measureText(watermarkSettings.text);
            const wmWidth = metrics.width;
            const wmHeight = watermarkSettings.fontSize;
            const { x, y } = computeWatermarkPosition(wmWidth, wmHeight, width, height);
            if (watermarkSettings.strokeWidth > 0) {
                ctx.lineWidth = watermarkSettings.strokeWidth;
                ctx.strokeStyle = watermarkSettings.strokeColor;
                ctx.strokeText(watermarkSettings.text, x, y);
            }
            ctx.fillStyle = watermarkSettings.color;
            ctx.fillText(watermarkSettings.text, x, y);
            ctx.restore();
        } else if (watermarkSettings.type === 'image' && watermarkSettings.image) {
            ctx.save();
            ctx.globalAlpha = watermarkSettings.opacity;
            const wmWidth = watermarkSettings.image.width;
            const wmHeight = watermarkSettings.image.height;
            const { x, y } = computeWatermarkPosition(wmWidth, wmHeight, width, height);
            ctx.drawImage(watermarkSettings.image, x, y, wmWidth, wmHeight);
            ctx.restore();
        }
    }

    function computeWatermarkPosition(wmWidth, wmHeight, canvasWidth, canvasHeight) {
        let x = 0, y = 0;
        switch (watermarkSettings.position) {
            case 'top-left':
                break;
            case 'top-center':
                x = (canvasWidth - wmWidth) / 2;
                break;
            case 'top-right':
                x = canvasWidth - wmWidth;
                break;
            case 'middle-left':
                y = (canvasHeight - wmHeight) / 2;
                break;
            case 'center':
                x = (canvasWidth - wmWidth) / 2;
                y = (canvasHeight - wmHeight) / 2;
                break;
            case 'middle-right':
                x = canvasWidth - wmWidth;
                y = (canvasHeight - wmHeight) / 2;
                break;
            case 'bottom-left':
                y = canvasHeight - wmHeight;
                break;
            case 'bottom-center':
                x = (canvasWidth - wmWidth) / 2;
                y = canvasHeight - wmHeight;
                break;
            case 'bottom-right':
                x = canvasWidth - wmWidth;
                y = canvasHeight - wmHeight;
                break;
        }
        x += watermarkSettings.offsetX;
        y += watermarkSettings.offsetY;
        return { x, y };
    }

    async function applyWatermarkToSlices() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        for (const slice of slicedImages) {
            const img = await loadImage(slice.baseDataURL);
            canvas.width = slice.width;
            canvas.height = slice.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, slice.width, slice.height);
            drawWatermark(ctx, slice.width, slice.height);
            slice.dataURL = canvas.toDataURL('image/jpeg', 0.95);
        }
    }

    function loadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    }

    async function updateWatermark() {
        if (!originalImage || slicedImages.length === 0) return;
        createFullViewImage(lastSliceWidth, lastSliceHeight);
        await applyWatermarkToSlices();
        displayResults();
    }

    const debouncedUpdateWatermark = debounce(updateWatermark, 16);

    function regenerateFullView() {
        if (!originalImage || !fullViewImage) return;
        createFullViewImage(lastSliceWidth, lastSliceHeight);
        displayResults();
    }
    
    // Event Listeners for drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    // Click on upload area to select file
    fileInputLabel.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
    
    // Process button
    processBtn.addEventListener('click', async () => {
        showLoading('Generating slices...');
        await Promise.resolve().then(processImage);
        hideLoading();
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        resetApp();
    });
    
    // Dismiss error
    dismissError.addEventListener('click', () => {
        errorMessage.classList.remove('active');
    });
    
    // Download button
    downloadBtn.addEventListener('click', () => {
        const originalText = downloadBtn.innerHTML;
        showButtonLoading(downloadBtn);
        
        // Use setTimeout to allow the UI to update before processing
        setTimeout(() => {
            downloadZip().then(() => {
                hideButtonLoading(downloadBtn, originalText);
            }).catch((error) => {
                console.error('Error creating zip:', error);
                hideButtonLoading(downloadBtn, originalText);
                showError('There was a problem creating your zip file. Please try again.');
            });
        }, 50);
    });
    
    // High-res toggle change
    highResToggle.addEventListener('change', () => {
        if (originalImage) {
            updateImageDetails();
        }
    });

    // Aspect ratio change
    aspectRatioSelect.addEventListener('change', () => {
        aspectRatio = aspectRatioSelect.value === '3:4' ? 3 / 4 : 4 / 5;
        if (originalImage) {
            updateImageDetails();
            resultContainer.style.display = 'none';
            downloadBtn.disabled = true;
        }
    });

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            backgroundSettings.mode = btn.dataset.mode;
            updateBgOptionVisibility();
            regenerateFullView();
        });
    });

    blurSlider.addEventListener('input', () => {
        backgroundSettings.blur = Number(blurSlider.value);
        regenerateFullView();
    });

    colorPicker.addEventListener('input', () => {
        backgroundSettings.color = colorPicker.value;
        regenerateFullView();
    });

    colorSwatches.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            backgroundSettings.color = e.target.dataset.color;
            colorPicker.value = backgroundSettings.color;
            regenerateFullView();
        }
    });

    gradientTypeSelect.addEventListener('change', () => {
        backgroundSettings.gradientType = gradientTypeSelect.value;
        regenerateFullView();
    });

    gradientAngleInput.addEventListener('input', () => {
        backgroundSettings.gradientAngle = Number(gradientAngleInput.value);
        regenerateFullView();
    });

    updateBgOptionVisibility();

    // Watermark control listeners
    watermarkType.addEventListener('change', () => {
        watermarkSettings.type = watermarkType.value;
        textWatermarkOptions.classList.toggle('active', watermarkType.value === 'text');
        imageWatermarkOptions.classList.toggle('active', watermarkType.value === 'image');
        debouncedUpdateWatermark();
    });

    wmTextInput.addEventListener('input', () => {
        watermarkSettings.text = wmTextInput.value;
        debouncedUpdateWatermark();
    });

    wmFontSize.addEventListener('input', () => {
        watermarkSettings.fontSize = parseInt(wmFontSize.value, 10) || 0;
        debouncedUpdateWatermark();
    });

    wmFontWeight.addEventListener('change', () => {
        watermarkSettings.fontWeight = wmFontWeight.value;
        debouncedUpdateWatermark();
    });

    wmColor.addEventListener('input', () => {
        watermarkSettings.color = wmColor.value;
        debouncedUpdateWatermark();
    });

    wmStrokeColor.addEventListener('input', () => {
        watermarkSettings.strokeColor = wmStrokeColor.value;
        debouncedUpdateWatermark();
    });

    wmStrokeWidth.addEventListener('input', () => {
        watermarkSettings.strokeWidth = parseInt(wmStrokeWidth.value, 10) || 0;
        debouncedUpdateWatermark();
    });

    wmImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                if (!/png$/i.test(file.name)) console.warn('Tip: PNG preserves transparency best for watermarks.');
                watermarkSettings.image = img;
                updateWatermark();
            };
            img.src = url;
        }
    });

    wmOpacity.addEventListener('input', () => {
        watermarkSettings.opacity = wmOpacity.value / 100;
        wmOpacityValue.textContent = `${wmOpacity.value}%`;
        debouncedUpdateWatermark();
    });

    wmPositionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            wmPositionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            watermarkSettings.position = btn.dataset.pos;
            debouncedUpdateWatermark();
        });
    });

    wmOffsetX.addEventListener('input', () => {
        watermarkSettings.offsetX = parseInt(wmOffsetX.value, 10) || 0;
        debouncedUpdateWatermark();
    });

    wmOffsetY.addEventListener('input', () => {
        watermarkSettings.offsetY = parseInt(wmOffsetY.value, 10) || 0;
        debouncedUpdateWatermark();
    });

    // Video control listeners
    if (videoDuration) {
        durationValue.textContent = `${videoDuration.value}s`;
        videoDuration.addEventListener('input', () => {
            durationValue.textContent = `${videoDuration.value}s`;
        });
    }

    if (videoFps) {
        fpsValue.textContent = videoFps.value;
        videoFps.addEventListener('input', () => {
            fpsValue.textContent = videoFps.value;
        });
    }

    if (videoBitrate) {
        bitrateValue.textContent = videoBitrate.value;
        videoBitrate.addEventListener('input', () => {
            bitrateValue.textContent = videoBitrate.value;
        });
    }

    directionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            directionButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panDirection = btn.dataset.dir;
        });
    });

    formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            formatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            outputFormat = btn.dataset.format;
        });
    });

    if (generateVideoBtn) {
        generateVideoBtn.addEventListener('click', generatePanVideo);
    }

    // Handle file upload
    function handleFile(file) {
        // Check if file is image
        if (!file.type.match('image.*')) {
            showError('Please select an image file');
            return;
        }
        
        showLoading('Loading your image...');
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // Create image object to get dimensions
            const img = new Image();
            
            img.onload = () => {
                hideLoading();
                
                // Check if image has horizontal aspect ratio
                if (img.width <= img.height) {
                    showError('Please upload a panorama image with a horizontal aspect ratio (width > height).');
                    return;
                }
                
                originalImage = {
                    element: img,
                    width: img.width,
                    height: img.height,
                    src: e.target.result
                };

                palette = extractPalette(img, 5);
                renderPalette(palette);
                if (palette.length) {
                    backgroundSettings.color = palette[0];
                    backgroundSettings.gradientColors = [palette[0], palette[1] || palette[0]];
                    colorPicker.value = backgroundSettings.color;
                }

                // Enable processing now that a valid image is loaded
                processBtn.disabled = false;
                downloadBtn.disabled = true;
                if (generateVideoBtn) generateVideoBtn.disabled = false;

                // Update image details
                updateImageDetails();

                // Show preview
                previewImg.src = e.target.result;

                // Hide error if shown
                errorMessage.classList.remove('active');

                // Show preview container
                uploadArea.style.display = 'none';
                previewContainer.style.display = 'block';
                resultContainer.style.display = 'none';
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            hideLoading();
            showError('There was an error reading the file. Please try again.');
        };
        
        reader.readAsDataURL(file);
    }
    
    // Update image details based on selected mode
    function updateImageDetails() {
        if (!originalImage) return;
        
        const isHighResMode = highResToggle.checked;
        const { scaledWidth, scaledHeight, sliceCount, sliceWidth, sliceHeight } = calculateOptimalScaling(
            originalImage.width, 
            originalImage.height, 
            isHighResMode
        );
        
        // Update image details
        originalSizeText.textContent = `${originalImage.width}px × ${originalImage.height}px`;
        scaledSizeText.textContent = `${scaledWidth}px × ${scaledHeight}px`;
        sliceCountText.textContent = sliceCount;
        sliceResolutionText.textContent = `${sliceWidth}px × ${sliceHeight}px`;
    }
    
    // Calculate optimal scaling to minimize wasted space
    function calculateOptimalScaling(originalWidth, originalHeight, highResMode) {
        // Default to standard resolution
        let sliceWidth = standardWidth;
        let sliceHeight = getStandardHeight();

        // For high-res mode: calculate the maximum possible slice size while maintaining aspect ratio
        if (highResMode) {
            // Calculate maximum height based on original image height
            sliceHeight = originalHeight;
            // Calculate corresponding width based on selected aspect ratio
            sliceWidth = Math.round(sliceHeight * aspectRatio);
        }

        // Initial scaling based on height
        const scaleFactor = sliceHeight / originalHeight;
        const baseScaledWidth = Math.round(originalWidth * scaleFactor);

        // Calculate how many full slices we can get
        const fullSlices = Math.floor(baseScaledWidth / sliceWidth);

        // Calculate the remaining width after using full slices
        const remainingWidth = baseScaledWidth - (fullSlices * sliceWidth);

        let finalSliceCount, finalScaledWidth, finalScaledHeight;

        // Ensure a minimum of 2 slices
        if (fullSlices < minSlices) {
            finalSliceCount = minSlices;
            finalScaledWidth = minSlices * sliceWidth;
            // Calculate height based on maintaining aspect ratio
            finalScaledHeight = Math.round((finalScaledWidth / originalWidth) * originalHeight);
        }
        // If remaining width is more than half a slice, add another slice
        else if (remainingWidth > (sliceWidth / 2)) {
            finalSliceCount = fullSlices + 1;
            finalScaledWidth = finalSliceCount * sliceWidth;
            // Adjust the scale factor to fit exactly the number of slices
            const adjustedScaleFactor = finalScaledWidth / originalWidth;
            finalScaledHeight = Math.round(originalHeight * adjustedScaleFactor);
        }
        // Otherwise use the original number of slices
        else {
            finalSliceCount = fullSlices;
            finalScaledWidth = finalSliceCount * sliceWidth;
            finalScaledHeight = sliceHeight;
        }

        return {
            scaledWidth: finalScaledWidth,
            scaledHeight: finalScaledHeight,
            sliceCount: finalSliceCount,
            sliceWidth: sliceWidth,
            sliceHeight: sliceHeight
        };
    }
    
    // Show error message
    function showError(message) {
        const errorText = errorMessage.querySelector('p');
        errorText.textContent = message;
        errorMessage.classList.add('active');

        // Scroll to error
        errorMessage.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Process image into slices
    async function processImage() {
        if (!originalImage) return;
        
        const isHighResMode = highResToggle.checked;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate optimal scaling and slicing
        const { scaledWidth, scaledHeight, sliceCount, sliceWidth, sliceHeight } = calculateOptimalScaling(
            originalImage.width, 
            originalImage.height,
            isHighResMode
        );
        
        // Set canvas dimensions
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        // Draw scaled image
        ctx.drawImage(originalImage.element, 0, 0, scaledWidth, scaledHeight);
        
        slicedImages = [];

        // Create each slice
        for (let i = 0; i < sliceCount; i++) {
            const sliceCanvas = document.createElement('canvas');
            const sliceCtx = sliceCanvas.getContext('2d');
            
            sliceCanvas.width = sliceWidth;
            sliceCanvas.height = sliceHeight;
            
            // Draw slice portion
            sliceCtx.drawImage(
                canvas, 
                i * sliceWidth, 0, sliceWidth, scaledHeight,
                0, 0, sliceWidth, sliceHeight
            );
            
            // Convert to data URL
            const baseDataURL = sliceCanvas.toDataURL('image/jpeg', 0.95);

            slicedImages.push({
                baseDataURL,
                dataURL: baseDataURL, // temporary, will be overwritten by applyWatermarkToSlices
                number: i + 1,
                width: sliceWidth,
                height: sliceHeight
            });
        }

        lastSliceWidth = sliceWidth;
        lastSliceHeight = sliceHeight;

        // Create the full panorama view on white background
        createFullViewImage(sliceWidth, sliceHeight);

        await applyWatermarkToSlices();

        // Show results
        displayResults();
    }
    
    // Create a full panorama view with customizable background
    function createFullViewImage(sliceWidth, sliceHeight) {
        if (!originalImage) return;

        const fullCanvas = document.createElement('canvas');
        const fullCtx = fullCanvas.getContext('2d');

        fullCanvas.width = sliceWidth;
        fullCanvas.height = sliceHeight;

        if (backgroundSettings.mode === 'blur') {
            const scale = Math.max(sliceWidth / originalImage.width, sliceHeight / originalImage.height);
            const w = originalImage.width * scale;
            const h = originalImage.height * scale;
            const bx = (sliceWidth - w) / 2;
            const by = (sliceHeight - h) / 2;
            fullCtx.filter = `blur(${backgroundSettings.blur}px)`;
            fullCtx.drawImage(originalImage.element, 0, 0, originalImage.width, originalImage.height, bx, by, w, h);
            fullCtx.filter = 'none';
        } else if (backgroundSettings.mode === 'solid') {
            fullCtx.fillStyle = backgroundSettings.color || '#FFFFFF';
            fullCtx.fillRect(0, 0, sliceWidth, sliceHeight);
        } else if (backgroundSettings.mode === 'gradient') {
            const colors = backgroundSettings.gradientColors.length >= 2 ? backgroundSettings.gradientColors : ['#000000', '#ffffff'];
            let grad;
            if (backgroundSettings.gradientType === 'radial') {
                grad = fullCtx.createRadialGradient(
                    sliceWidth / 2,
                    sliceHeight / 2,
                    0,
                    sliceWidth / 2,
                    sliceHeight / 2,
                    Math.max(sliceWidth, sliceHeight) / 2
                );
            } else {
                const angle = (backgroundSettings.gradientAngle || 0) * Math.PI / 180;
                const x0 = sliceWidth / 2 + Math.cos(angle) * sliceWidth / 2;
                const y0 = sliceHeight / 2 + Math.sin(angle) * sliceHeight / 2;
                const x1 = sliceWidth / 2 - Math.cos(angle) * sliceWidth / 2;
                const y1 = sliceHeight / 2 - Math.sin(angle) * sliceHeight / 2;
                grad = fullCtx.createLinearGradient(x0, y0, x1, y1);
            }
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[1]);
            fullCtx.fillStyle = grad;
            fullCtx.fillRect(0, 0, sliceWidth, sliceHeight);
        } else {
            fullCtx.fillStyle = '#FFFFFF';
            fullCtx.fillRect(0, 0, sliceWidth, sliceHeight);
        }

        const margin = Math.round(sliceWidth * 0.08);
        const availableWidth = sliceWidth - (margin * 2);
        const availableHeight = sliceHeight - (margin * 2);
        const originalAspectRatio = originalImage.width / originalImage.height;
        let scaledPanoWidth, scaledPanoHeight;

        if (originalAspectRatio > availableWidth / availableHeight) {
            scaledPanoWidth = availableWidth;
            scaledPanoHeight = scaledPanoWidth / originalAspectRatio;
        } else {
            scaledPanoHeight = availableHeight;
            scaledPanoWidth = scaledPanoHeight * originalAspectRatio;
        }

        const x = Math.round((sliceWidth - scaledPanoWidth) / 2);
        const y = Math.round((sliceHeight - scaledPanoHeight) / 2);

        fullCtx.drawImage(
            originalImage.element,
            0, 0, originalImage.width, originalImage.height,
            x, y, scaledPanoWidth, scaledPanoHeight
        );

        fullCtx.strokeStyle = '#EEEEEE';
        fullCtx.lineWidth = 1;
        fullCtx.strokeRect(x - 1, y - 1, scaledPanoWidth + 2, scaledPanoHeight + 2);

        drawWatermark(fullCtx, sliceWidth, sliceHeight);

        fullViewImage = {
            dataURL: fullCanvas.toDataURL('image/jpeg', 0.95),
            width: sliceWidth,
            height: sliceHeight
        };
    }
    
    // Display processed slices
    function displayResults() {
        slicesPreview.innerHTML = '';
        
        // Add the full view as the first item with special styling
        if (fullViewImage) {
            const fullViewItem = document.createElement('div');
            fullViewItem.className = 'slice-item full-view-item';
            
            const img = document.createElement('img');
            img.src = fullViewImage.dataURL;
            img.alt = 'Full Panorama View';
            
            const label = document.createElement('div');
            label.className = 'slice-label';
            label.textContent = 'Full View';
            
            const resolution = document.createElement('div');
            resolution.className = 'resolution';
            resolution.textContent = `${fullViewImage.width}×${fullViewImage.height}`;
            
            fullViewItem.appendChild(img);
            fullViewItem.appendChild(label);
            fullViewItem.appendChild(resolution);
            slicesPreview.appendChild(fullViewItem);
        }
        
        // Add all the regular slices
        slicedImages.forEach(slice => {
            const sliceItem = document.createElement('div');
            sliceItem.className = 'slice-item';
            
            const img = document.createElement('img');
            img.src = slice.dataURL;
            img.alt = `Slice ${slice.number}`;
            
            const number = document.createElement('div');
            number.className = 'slice-number';
            number.textContent = slice.number;
            
            const resolution = document.createElement('div');
            resolution.className = 'resolution';
            resolution.textContent = `${slice.width}×${slice.height}`;
            
            sliceItem.appendChild(img);
            sliceItem.appendChild(number);
            sliceItem.appendChild(resolution);
            slicesPreview.appendChild(sliceItem);
        });
        
        resultContainer.style.display = 'block';
        downloadBtn.disabled = false;
        window.scrollTo({
            top: resultContainer.offsetTop - 20,
            behavior: 'smooth'
        });
    }
    
    // Reset app to initial state
    function resetApp() {
        // Clear file input
        fileInput.value = '';
        
        // Hide preview and results
        previewContainer.style.display = 'none';
        resultContainer.style.display = 'none';
        errorMessage.classList.remove('active');

        // Show upload area
        uploadArea.style.display = 'block';
        processBtn.disabled = true;
        downloadBtn.disabled = true;
        if (generateVideoBtn) generateVideoBtn.disabled = true;
        
        // Clear image data
        originalImage = null;
        slicedImages = [];
        fullViewImage = null;
        palette = [];
        lastSliceWidth = 0;
        lastSliceHeight = 0;
        aspectRatioSelect.value = '4:5';
        aspectRatio = 4 / 5;
        backgroundSettings = {
            mode: 'original',
            blur: 20,
            color: '#ffffff',
            gradientType: 'linear',
            gradientAngle: 0,
            gradientColors: []
        };
        navButtons.forEach(btn => btn.classList.remove('active'));
        if (navButtons.length) {
            navButtons[0].classList.add('active');
        }
        colorSwatches.innerHTML = '';
        updateBgOptionVisibility();
        
        // Clear preview
        previewImg.src = '';
    }

    function getEasingFunction(type) {
        const easings = {
            'linear': t => t,
            'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            'smooth': t => t * t * (3 - 2 * t),
            'ease-out': t => 1 - Math.pow(1 - t, 2),
        };
        return easings[type] || easings['linear'];
    }

    function computePanPosition(t, dir, maxOffset, easing) {
        if (maxOffset <= 0) return 0;
        switch (dir) {
            case 'ltr':
                return -maxOffset * easing(t);
            case 'rtl':
                return -maxOffset * (1 - easing(t));
            case 'lrl':
                if (t < 0.5) {
                    return -maxOffset * easing(t * 2);
                } else {
                    return -maxOffset * (1 - easing((t - 0.5) * 2));
                }
            case 'rlr':
                if (t < 0.5) {
                    return -maxOffset * (1 - easing(t * 2));
                } else {
                    return -maxOffset * easing((t - 0.5) * 2);
                }
            default:
                return 0;
        }
    }

    async function generatePanVideo() {
        if (!originalImage) return;

        // Provide feedback while rendering the video
        showLoading('Generating video...');
        if (generateVideoBtn) generateVideoBtn.disabled = true;

        const duration = Number(videoDuration.value);
        const fps = Number(videoFps.value);
        const bitrate = Number(videoBitrate.value) * 1000000;
        const easing = getEasingFunction(easingSelect.value);
        const format = outputFormat;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = standardWidth;
        canvas.height = getStandardHeight();

        const stream = canvas.captureStream(fps);
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
            stream.getTracks().forEach(t => t.stop());
            hideLoading();
            if (generateVideoBtn) generateVideoBtn.disabled = false;
            alert('Video format not supported in this browser.');
            return;
        }
        let recorder;
        try {
            recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        } catch (e) {
            stream.getTracks().forEach(t => t.stop());
            hideLoading();
            if (generateVideoBtn) generateVideoBtn.disabled = false;
            alert('Unable to start video recording.');
            return;
        }

        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            if (currentVideoUrl) {
                URL.revokeObjectURL(currentVideoUrl);
            }
            currentVideoUrl = URL.createObjectURL(blob);
            videoResult.innerHTML = '';
            const video = document.createElement('video');
            video.controls = true;
            video.src = currentVideoUrl;
            videoResult.appendChild(video);
            const link = document.createElement('a');
            link.href = currentVideoUrl;
            link.download = `pan_video.${format}`;
            link.textContent = 'Download Video';
            link.className = 'btn btn-secondary';
            videoResult.appendChild(link);
            stream.getTracks().forEach(t => t.stop());
            hideLoading();
            if (generateVideoBtn) generateVideoBtn.disabled = false;
        };

        const scale = canvas.height / originalImage.height;
        const scaledWidth = originalImage.width * scale;
        const maxOffset = scaledWidth - canvas.width;

        let frame = 0;
        const totalFrames = Math.round(duration * fps);

        recorder.start();

        function drawFrame() {
            const t = frame / (totalFrames - 1);
            const x = computePanPosition(t, panDirection, maxOffset, easing);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(originalImage.element || originalImage, x, 0, scaledWidth, canvas.height);
            drawWatermark(ctx, canvas.width, canvas.height);
            frame++;
            if (frame < totalFrames) {
                setTimeout(drawFrame, 1000 / fps);
            } else {
                recorder.stop();
            }
        }

        drawFrame();
    }

    // Download slices as zip file
    async function downloadZip() {
        if (slicedImages.length === 0) return;
        
        const zip = new JSZip();
        const isHighRes = highResToggle.checked;
        const folderName = isHighRes ? 'high_res_slices' : 'standard_slices';
        
        // Add the full view as slice_00.jpg if available
        if (fullViewImage) {
            const imageData = fullViewImage.dataURL.split(',')[1];
            zip.file(`${folderName}/slice_00_full_view.jpg`, imageData, { base64: true });
        }
        
        // Add each slice to the zip
        slicedImages.forEach(slice => {
            // Convert data URL to blob
            const imageData = slice.dataURL.split(',')[1];
            zip.file(`${folderName}/slice_${String(slice.number).padStart(2, '0')}.jpg`, imageData, { base64: true });
        });
        
        // Add a readme file explaining the full view
        const currentDate = new Date().toISOString().split('T')[0];
        const ratioLabel = aspectRatioSelect.value;
        const readmeContent =
`Instagram Panorama Slicer - Created by FUTC (@FUTC.Photography on Instagram)

IF YOU LIKE THIS TOOL, PLEASE CONSIDER SUPPORTING ME BY CHECKING OUT MY LIGHTROOM PRESET PACKS (this link includes a heavy discount): https://futc.gumroad.com/l/analogvibes2/panosplitter

This package contains:
- slice_00_full_view.jpg: A complete view of your panorama that fits the ${ratioLabel} aspect ratio
- slice_01.jpg to slice_${String(slicedImages.length).padStart(2, '0')}.jpg: Individual slices of your panorama

For best results on Instagram:
1. Make an instagram carousel post adding slice_01.jpg through slice_${String(slicedImages.length).padStart(2, '0')}.jpg in order
2. Add slice_00_full_view.jpg either as the first or last image in the carousel
`;
        
        zip.file('README.txt', readmeContent);
        
        // Generate zip file
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'instagram_carousel_slices.zip');
    }
});
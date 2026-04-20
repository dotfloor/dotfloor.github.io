(function() {
    const DOODLE_API = "http://localhost:4001/save_doodle";

    let fabricLoaded = false;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
    script.onload = () => fabricLoaded = true;
    document.head.appendChild(script);

    window.openDoodle = function(id) {
        if (!fabricLoaded) {
            alert("Please wait a moment for the drawing library (Fabric.js) to load...");
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'doodle-modal-' + id;
        Object.assign(modal.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: '999999',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace'
        });

        // The whole site uses filter: invert(1) for dark mode. To make the drawing UI normal, we counteract it.
        const bodyFilter = window.getComputedStyle(document.body).filter;
        if (bodyFilter && bodyFilter.includes('invert')) {
            modal.style.filter = 'invert(1)';
        }

        const toolbar = document.createElement('div');
        Object.assign(toolbar.style, {
            display: 'flex', gap: '15px', marginBottom: '15px', padding: '10px 20px',
            backgroundColor: '#222', borderRadius: '8px', color: 'white', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90vw'
        });

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color'; colorPicker.value = '#7f7f7f'; colorPicker.style.cursor = 'pointer';

        const bgPicker = document.createElement('input');
        bgPicker.type = 'color'; bgPicker.value = '#ffffff'; bgPicker.style.cursor = 'pointer';

        const transLabel = document.createElement('label');
        transLabel.style.display = 'flex'; transLabel.style.alignItems = 'center'; transLabel.style.cursor = 'pointer';
        const transCheckbox = document.createElement('input');
        transCheckbox.type = 'checkbox'; transCheckbox.checked = true; transCheckbox.style.cursor = 'pointer';
        transLabel.append(transCheckbox, document.createTextNode(' Transparent'));

        const sizePicker = document.createElement('input');
        sizePicker.type = 'range'; sizePicker.min = '1'; sizePicker.max = '50'; sizePicker.value = '5';
        
        const widthInput = document.createElement('input');
        widthInput.type = 'number'; widthInput.style.width = '60px'; widthInput.title = 'Canvas Width';
        
        const heightInput = document.createElement('input');
        heightInput.type = 'number'; heightInput.style.width = '60px'; heightInput.title = 'Canvas Height';

        const clearBtn = document.createElement('button'); clearBtn.innerText = 'Clear';
        const undoBtn = document.createElement('button'); undoBtn.innerText = 'Undo';
        
        const eraserBtn = document.createElement('button'); eraserBtn.innerText = 'Eraser';
        let isEraser = false;

        const cancelBtn = document.createElement('button'); cancelBtn.innerText = 'Cancel';
        cancelBtn.onclick = () => document.body.removeChild(modal);

        const saveBtn = document.createElement('button');
        saveBtn.innerText = 'Save & Close';
        saveBtn.style.backgroundColor = '#4CAF50'; saveBtn.style.color = 'white'; saveBtn.style.fontWeight = 'bold'; saveBtn.style.cursor = 'pointer';

        toolbar.append(
            document.createTextNode("Pen: "), colorPicker, 
            document.createTextNode(" BG: "), bgPicker, transLabel,
            document.createTextNode(" W: "), widthInput,
            document.createTextNode(" H: "), heightInput,
            document.createTextNode(" Brush: "), sizePicker, 
            undoBtn, eraserBtn, clearBtn, cancelBtn, saveBtn
        );

        const canvasContainer = document.createElement('div');
        Object.assign(canvasContainer.style, {
            backgroundColor: 'black', border: '2px solid #555', borderRadius: '4px',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)', maxWidth: '95vw', maxHeight: '75vh', overflow: 'auto'
        });
        
        const canvasEl = document.createElement('canvas');
        canvasEl.id = 'fabric-canvas-' + id;
        canvasContainer.appendChild(canvasEl);

        modal.appendChild(toolbar);
        modal.appendChild(canvasContainer);
        document.body.appendChild(modal);

        // Responsive defaults
        let cw = Math.min(800, window.innerWidth - 40);
        let ch = Math.min(600, window.innerHeight - 150);
        
        widthInput.value = cw;
        heightInput.value = ch;

        const canvas = new fabric.Canvas(canvasEl.id, {
            isDrawingMode: true, width: cw, height: ch, backgroundColor: 'transparent'
        });

        // When user manually types a size:
        const updateDimensions = () => {
            const nw = parseInt(widthInput.value) || 100;
            const nh = parseInt(heightInput.value) || 100;
            canvas.setDimensions({ width: nw, height: nh });
        };
        widthInput.onchange = updateDimensions;
        heightInput.onchange = updateDimensions;

        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = colorPicker.value;
        canvas.freeDrawingBrush.width = parseInt(sizePicker.value, 10);

        colorPicker.onchange = () => canvas.freeDrawingBrush.color = colorPicker.value;
        const updateBg = () => {
            canvas.backgroundColor = transCheckbox.checked ? 'transparent' : bgPicker.value;
            canvasContainer.style.backgroundColor = transCheckbox.checked ? 'black' : 'white';
            canvas.renderAll();
        };
        bgPicker.onchange = updateBg;
        transCheckbox.onchange = updateBg;
        sizePicker.oninput = () => canvas.freeDrawingBrush.width = parseInt(sizePicker.value, 10);

        // Undo functionality
        undoBtn.onclick = () => {
            const objs = canvas.getObjects();
            if (objs.length > 0) canvas.remove(objs[objs.length - 1]);
        };

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undoBtn.click();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Clean up global listener on cancel to prevent leaks
        cancelBtn.onclick = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(modal);
        };

        // Eraser functionality mapping
        eraserBtn.onclick = () => {
            isEraser = !isEraser;
            eraserBtn.style.backgroundColor = isEraser ? '#ffc107' : '';
            eraserBtn.style.color = isEraser ? 'black' : '';
            canvas.isDrawingMode = !isEraser;
            canvas.selection = !isEraser; // Disable grouping
            canvas.getObjects().forEach(o => o.set('hoverCursor', isEraser ? 'crosshair' : 'move'));
        };

        // When in Eraser mode, clicking or scrubbing over strokes wipes them out!
        canvas.on('mouse:down', (e) => {
            if (isEraser && e.target) canvas.remove(e.target);
        });
        canvas.on('mouse:move', (e) => {
            if (isEraser && e.e.buttons === 1 && e.target) canvas.remove(e.target);
        });

        clearBtn.onclick = () => { canvas.clear(); updateBg(); };

        saveBtn.onclick = async () => {
            saveBtn.innerText = "Saving..."; saveBtn.disabled = true;
            // Native resolution WebP output for sharp quality
            const dataUrl = canvas.toDataURL({ format: 'webp', multiplier: 1 });
            
            try {
                const res = await fetch(DOODLE_API, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: id, image_data: dataUrl })
                });

                if (res.ok) {
                    saveBtn.innerText = "Waiting for Jekyll reload...";
                    setTimeout(() => {
                        document.body.removeChild(modal); window.location.reload(true);
                    }, 2000); // Give jekyll 2 seconds to see the new file and rebuild
                } else {
                    alert("Failed to save doodle. Make sure server is running!");
                    saveBtn.innerText = "Save & Close"; saveBtn.disabled = false;
                }
            } catch(e) {
                console.error(e); alert("Cannot connect to local doodle server on port 4001.");
                saveBtn.innerText = "Save & Close"; saveBtn.disabled = false;
            }
        };
        
        const existingImg = document.querySelector(`.doodle-container[data-doodle-id="${id}"] img.doodle-img`);
        if (existingImg) {
            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = 'Delete';
            deleteBtn.style.backgroundColor = '#f44336'; deleteBtn.style.color = 'white'; deleteBtn.style.cursor = 'pointer';
            deleteBtn.onclick = async () => {
                if(confirm("Are you sure you want to irreversibly delete this doodle?")) {
                    try {
                        const res = await fetch("http://localhost:4001/delete_doodle", {
                            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id })
                        });
                        if (res.ok) { 
                            deleteBtn.innerText = "Waiting for reload...";
                            setTimeout(() => {
                                document.body.removeChild(modal); window.location.reload(true);
                            }, 2000);
                        }
                        else alert("Failed to delete.");
                    } catch(e) { alert("Server error."); }
                }
            };
            toolbar.insertBefore(deleteBtn, cancelBtn);

            fabric.Image.fromURL(existingImg.src.split('?')[0], function(img) {
                // Resize the entire canvas to exactly match the loaded image dimensions!
                widthInput.value = img.width;
                heightInput.value = img.height;
                canvas.setDimensions({ width: img.width, height: img.height });

                // Resolution is native now, no scaling needed
                img.set({ scaleX: 1, scaleY: 1, left: 0, top: 0 });
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            }, { crossOrigin: 'anonymous' });
        }
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const textInput = document.getElementById('text-input');
    const fontSelect = document.getElementById('font-select');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const inkColor = document.getElementById('ink-color');
    const randomnessSlider = document.getElementById('randomness-slider');
    const randomnessValue = document.getElementById('randomness-value');
    const paperSelect = document.getElementById('paper-select');
    const convertBtn = document.getElementById('convert-btn');
    const outputPaper = document.getElementById('output-paper');
    const handwritingOutput = document.getElementById('handwriting-output');
    const downloadBtn = document.getElementById('download-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const copyBtn = document.getElementById('copy-btn');
    const aboutLink = document.getElementById('about-link');
    const aboutModal = document.getElementById('about-modal');
    const closeBtn = document.querySelector('.close-btn');

    // New elements for color sections
    const colorSectionsContainer = document.getElementById('color-sections-container');
    const addSectionBtn = document.getElementById('add-section-btn');
    
    // PDF related elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const pdfInput = document.getElementById('pdf-input');
    const pdfPreview = document.getElementById('pdf-preview');
    const pdfPages = document.getElementById('pdf-pages');
    const extractTextBtn = document.getElementById('extract-text-btn');
    
    // Store PDF document
    let pdfDoc = null;
    let extractedText = '';

    // Global variable to store sections
    let textSections = [];

    // Initial setup for color sections
    addSection(); // Add one section by default

    addSectionBtn.addEventListener('click', addSection);

    function addSection(text = '', color = '#000000') {
        const sectionId = `section-${textSections.length}`;
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('color-section-input');
        sectionDiv.dataset.sectionId = sectionId;

        sectionDiv.innerHTML = `
            <textarea id="text-${sectionId}" placeholder="Enter text for this section...">${text}</textarea>
            <input type="color" id="color-${sectionId}" value="${color}">
            <button class="remove-section-btn btn-secondary" data-section-id="${sectionId}">Remove</button>
        `;

        colorSectionsContainer.appendChild(sectionDiv);
        textSections.push({ id: sectionId, text: text, color: color });

        // Add event listener for remove button
        sectionDiv.querySelector('.remove-section-btn').addEventListener('click', removeSection);

        // Update textSections when textarea or color input changes
        sectionDiv.querySelector(`#text-${sectionId}`).addEventListener('input', (e) => {
            const section = textSections.find(s => s.id === sectionId);
            if (section) section.text = e.target.value;
        });
        sectionDiv.querySelector(`#color-${sectionId}`).addEventListener('input', (e) => {
            const section = textSections.find(s => s.id === sectionId);
            if (section) section.color = e.target.value;
        });
    }

    function removeSection(event) {
        const sectionIdToRemove = event.target.dataset.sectionId;
        const sectionDivToRemove = document.querySelector(`[data-section-id="${sectionIdToRemove}"]`);
        if (sectionDivToRemove) {
            colorSectionsContainer.removeChild(sectionDivToRemove);
            textSections = textSections.filter(section => section.id !== sectionIdToRemove);
        }
    }

    // Tab switching functionality
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            
            // Show corresponding content
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.remove('hidden');
        });
    });

    // PDF file input handling
    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            await loadPdf(file);
        } else if (file) {
            pdfPreview.innerHTML = 'Please select a valid PDF file.';
            extractTextBtn.disabled = true;
        }
    });
    
    // Function to load PDF
    async function loadPdf(file) {
        // Show loading state
        pdfPreview.innerHTML = 'Loading PDF... <span class="loading"></span>';
        pdfPages.innerHTML = '';
        
        try {
            // Read the file as ArrayBuffer
            const fileReader = new FileReader();
            
            fileReader.onload = async function() {
                try {
                    const typedArray = new Uint8Array(this.result);
                    
                    // Load the PDF document
                    // Ensure PDF.js is properly loaded
                    if (typeof pdfjsLib === 'undefined') {
                        throw new Error('PDF.js library not loaded correctly.');
                    }
                    
                    pdfDoc = await pdfjsLib.getDocument({data: typedArray}).promise;
                    
                    // Update preview
                    pdfPreview.textContent = `PDF loaded: ${file.name} (${pdfDoc.numPages} pages)`;
                    
                    // Enable extract button
                    extractTextBtn.disabled = false;
                    
                    // Display thumbnails of the first few pages
                    const pagesToShow = Math.min(pdfDoc.numPages, 5);
                    for (let i = 1; i <= pagesToShow; i++) {
                        const page = await pdfDoc.getPage(i);
                        const viewport = page.getViewport({ scale: 0.3 });
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        await page.render({
                            canvasContext: context,
                            viewport: viewport
                        }).promise;
                        
                        pdfPages.appendChild(canvas);
                    }
                } catch (error) {
                    console.error('Error processing PDF:', error);
                    pdfPreview.innerHTML = 'Error loading PDF: ' + error.message + '. Please try another file.';
                    extractTextBtn.disabled = true;
                }
            };
            
            fileReader.onerror = function() {
                console.error('Error reading file:', fileReader.error);
                pdfPreview.innerHTML = 'Error reading file. Please try again.';
                extractTextBtn.disabled = true;
            };
            
            fileReader.readAsArrayBuffer(file);
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            pdfPreview.innerHTML = 'Error loading PDF. Please try another file.';
            extractTextBtn.disabled = true;
        }
    }
    
    // Extract text from PDF
    extractTextBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;
        
        // Show loading state
        extractTextBtn.innerHTML = 'Extracting... <span class="loading"></span>';
        extractTextBtn.disabled = true;
        
        try {
            let fullText = '';
            
            // Process each page
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                
                // Extract text from the page with better spacing handling
                let lastY = null;
                let pageText = '';
                
                for (const item of textContent.items) {
                    // Add newline when Y position changes significantly (new paragraph)
                    if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                        pageText += '\n';
                    }
                    
                    // Add the text with proper spacing
                    pageText += item.str + ' ';
                    lastY = item.transform[5];
                }
                
                fullText += pageText.trim() + '\n\n';
            }
            
            // Trim extra spaces and newlines
            extractedText = fullText.trim();

            // Update text input with extracted text or the first color section
            if (textSections.length > 0) {
                // Update the first section's text and its textarea
                textSections[0].text = extractedText;
                const firstSectionTextArea = document.getElementById(`text-${textSections[0].id}`);
                if (firstSectionTextArea) {
                    firstSectionTextArea.value = extractedText;
                }
                textInput.value = ''; // Clear the main text input if sections are used
            } else {
                textInput.value = extractedText;
            }
            
            // Switch back to text tab
            tabBtns[0].click();
            
            // Reset button text
            extractTextBtn.textContent = 'Extract Text from PDF';
            extractTextBtn.disabled = false;
            
        } catch (error) {
            console.error('Error extracting text:', error);
            extractTextBtn.textContent = 'Error - Try Again';
            extractTextBtn.disabled = false;
        }
    });

    // Update size value display
    sizeSlider.addEventListener('input', () => {
        sizeValue.textContent = `${sizeSlider.value}px`;
    });

    // Update randomness value display
    randomnessSlider.addEventListener('input', () => {
        const randomnessLabels = ['None', 'Very Low', 'Low', 'Medium-Low', 'Medium', 'Medium-High', 'High', 'Very High', 'Extreme', 'Maximum', 'Chaotic'];
        randomnessValue.textContent = randomnessLabels[randomnessSlider.value];
    });

    // Change paper background
    paperSelect.addEventListener('change', () => {
        // Remove all previous classes
        outputPaper.classList.remove('lined', 'grid', 'yellow');
        
        // Add the selected class if not default white
        if (paperSelect.value !== 'white') {
            outputPaper.classList.add(paperSelect.value);
        }
    });

    // Convert text to handwriting
    convertBtn.addEventListener('click', () => {
        // If there are color sections with text, prioritize them
        const hasSectionText = textSections.some(section => section.text.trim() !== '');
        const useColorSections = hasSectionText || (textSections.length > 1 && textInput.value.trim() === '');

        if (!textInput.value.trim() && !hasSectionText) {
            alert('Please enter some text to convert or add text to a section!');
            return;
        }

        // Apply handwriting style
        applyHandwritingStyle(useColorSections);
    });

    // Apply handwriting style
    function applyHandwritingStyle(useColorSections) {
        // Get all settings
        const font = fontSelect.value;
        const size = sizeSlider.value;
        const randomness = randomnessSlider.value;

        // Clear previous content
        handwritingOutput.innerHTML = '';

        let sectionsToRender = [];
        if (useColorSections) {
            sectionsToRender = textSections.filter(section => section.text.trim() !== '');
            // If no sections have text, fall back to main textInput with the default color
            if (sectionsToRender.length === 0 && textInput.value.trim() !== '') {
                sectionsToRender.push({ text: textInput.value, color: inkColor.value });
            }
        } else {
            sectionsToRender.push({ text: textInput.value, color: inkColor.value });
        }

        sectionsToRender.forEach((sectionData, sectionIndex) => {
            const text = sectionData.text;
            const color = sectionData.color;

            // Split text into lines
            const lines = text.split('\n');

            // Process each line
            lines.forEach((line, index) => {
                const lineDiv = document.createElement('div');
                lineDiv.classList.add('handwriting-line');

                // Split line into words to maintain proper spacing
                const words = line.split(' ');

                words.forEach((word, wordIndex) => {
                    // Process each character in the word
                    [...word].forEach(char => {
                        const charSpan = document.createElement('span');
                        charSpan.textContent = char;

                        // Apply base styles
                        charSpan.style.fontFamily = font;
                        charSpan.style.fontSize = `${size}px`;
                        charSpan.style.color = color;

                        // Apply randomization if enabled
                        if (randomness > 0) {
                            // Calculate random adjustments based on randomness level
                            const randomFactor = randomness / 10;
                            
                            // Random rotation (slant)
                            const rotation = (Math.random() - 0.5) * randomFactor * 10;
                            
                            // Random vertical position
                            const verticalPos = (Math.random() - 0.5) * randomFactor * 6;
                            
                            // Random size variation
                            const sizeVariation = 1 + (Math.random() - 0.5) * randomFactor * 0.4;
                            
                            // Apply transformations
                            charSpan.style.display = 'inline-block';
                            charSpan.style.transform = `rotate(${rotation}deg) translateY(${verticalPos}px) scale(${sizeVariation})`;
                            
                            // Random spacing between characters
                            charSpan.style.letterSpacing = `${(Math.random() - 0.5) * randomFactor * 3}px`;
                        }

                        lineDiv.appendChild(charSpan);
                    });

                    // Add space between words (if not the last word)
                    if (wordIndex < words.length - 1) {
                        const spaceSpan = document.createElement('span');
                        spaceSpan.textContent = ' ';
                        spaceSpan.style.fontFamily = font;
                        spaceSpan.style.fontSize = `${size}px`;

                        // Add slight randomization to spaces if enabled
                        if (randomness > 0) {
                            const randomFactor = randomness / 10;
                            spaceSpan.style.display = 'inline-block';
                            spaceSpan.style.width = `${Math.max(5, 8 + (Math.random() - 0.5) * randomFactor * 6)}px`;
                        } else {
                            spaceSpan.style.marginRight = '5px';
                        }

                        lineDiv.appendChild(spaceSpan);
                    }
                });

                handwritingOutput.appendChild(lineDiv);

                // Add space between lines with slight randomization
                if (index < lines.length - 1) {
                    const lineHeight = 1.5 + (Math.random() * 0.3 * (randomness / 10));
                    lineDiv.style.marginBottom = `${lineHeight}em`;
                }
            });
            // Add a margin between different color sections for visual separation
            if (sectionIndex < sectionsToRender.length - 1) {
                const sectionSeparator = document.createElement('div');
                sectionSeparator.style.marginBottom = '2em'; // Adjust as needed
                handwritingOutput.appendChild(sectionSeparator);
            }
        });
    }

    // Download as image
    downloadBtn.addEventListener('click', () => {
        if (handwritingOutput.innerHTML === 'Your handwritten text will appear here...') {
            alert('Please convert some text first!');
            return;
        }
        
        html2canvas(outputPaper).then(canvas => {
            const link = document.createElement('a');
            link.download = 'handwriting.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
    
    // Download as PDF
    downloadPdfBtn.addEventListener('click', () => {
        if (handwritingOutput.innerHTML === 'Your handwritten text will appear here...') {
            alert('Please convert some text first!');
            return;
        }
        
        // Change button text to show loading
        const originalText = downloadPdfBtn.textContent;
        downloadPdfBtn.innerHTML = 'Creating PDF... <span class="loading"></span>';
        downloadPdfBtn.disabled = true;
        
        // Ensure html2canvas is loaded
        if (typeof html2canvas === 'undefined') {
            loadHtml2Canvas().then(() => {
                createPdf(originalText);
            }).catch(err => {
                console.error('Failed to load html2canvas:', err);
                downloadPdfBtn.textContent = originalText;
                downloadPdfBtn.disabled = false;
                alert('Error: Failed to load required libraries. Please refresh and try again.');
            });
        } else {
            createPdf(originalText);
        }
    });
    
    // Function to create and download PDF
    function createPdf(originalButtonText) {
        setTimeout(() => {
            html2canvas(outputPaper, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false
            }).then(canvas => {
                try {
                    // Create PDF
                    if (typeof window.jspdf === 'undefined') {
                        throw new Error('jsPDF library not loaded correctly');
                    }
                    
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm'
                    });
                    
                    // A4 dimensions in mm
                    const pageWidth = 210;
                    const pageHeight = 297;
                    
                    // Calculate dimensions
                    const imgWidth = pageWidth;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    // Calculate number of pages needed
                    const totalPages = Math.ceil(imgHeight / pageHeight);
                    
                    // Add each page to the PDF
                    for (let i = 0; i < totalPages; i++) {
                        // Add new page if not the first page
                        if (i > 0) {
                            pdf.addPage();
                        }
                        
                        // Calculate the height of the current page
                        const currentPageHeight = Math.min(pageHeight, imgHeight - (i * pageHeight));
                        
                        // Calculate the y position for the current page
                        const yPos = -(i * pageHeight);
                        
                        // Add the image slice for the current page
                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        pdf.addImage(imgData, 'JPEG', 0, yPos, imgWidth, imgHeight);
                    }
                    
                    // Save PDF
                    pdf.save('handwritten_document.pdf');
                } catch (err) {
                    console.error('Error generating PDF:', err);
                    alert('Error creating PDF: ' + err.message + '. Please refresh and try again.');
                } finally {
                    // Reset button
                    downloadPdfBtn.textContent = originalButtonText;
                    downloadPdfBtn.disabled = false;
                }
            }).catch(err => {
                console.error('Error capturing content for PDF:', err);
                downloadPdfBtn.textContent = originalButtonText;
                downloadPdfBtn.disabled = false;
                alert('Error creating PDF. Please try again.');
            });
        }, 100);
    }

    // Copy text
    copyBtn.addEventListener('click', () => {
        if (textInput.value.trim() === '') {
            alert('Please enter some text first!');
            return;
        }
        
        navigator.clipboard.writeText(textInput.value)
            .then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                alert('Failed to copy text: ' + err);
            });
    });

    // Modal functionality
    aboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        aboutModal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        aboutModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.style.display = 'none';
        }
    });

    // Load necessary libraries
    function loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            if (typeof html2canvas !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
            script.onload = () => {
                console.log('html2canvas loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load html2canvas'));
            };
            document.head.appendChild(script);
        });
    }
    
    // Load libraries on page load
    function loadLibraries() {
        // Load html2canvas
        loadHtml2Canvas();
        
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            console.log('Loading jsPDF library...');
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => console.log('jsPDF loaded');
            script.onerror = () => console.error('Failed to load jsPDF');
            document.head.appendChild(script);
        }
    }
    
    loadLibraries();
}); 
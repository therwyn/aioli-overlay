// Aioli Overlay JavaScript

let sectionsConfig = [];
const pollingIntervals = [];
const sectionData = new Map(); // Store data for each section by index

function clearPollingIntervals() {
    while (pollingIntervals.length) {
        clearInterval(pollingIntervals.pop());
    }
}

// Fetch sections configuration from server
async function fetchSectionsConfig() {
    try {
        const response = await fetch('/api/sections');
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.sections)) {
                sectionsConfig = data.sections;
                return true;
            }
        } else {
            console.error('Failed to fetch sections config:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching sections config:', error);
    }
    return false;
}

// Generic function to fetch counter value from a file path
async function fetchCounter(filePath, sectionIndex, counterKey) {
    try {
        const response = await fetch(`/api/counter?path=${encodeURIComponent(filePath)}`);
        if (response.ok) {
            const data = await response.json();
            const newCount = parseInt(data.count) || 0;
            
            if (!sectionData.has(sectionIndex)) {
                sectionData.set(sectionIndex, {});
            }
            const section = sectionData.get(sectionIndex);
            
            if (section[counterKey] !== newCount) {
                section[counterKey] = newCount;
                updateCounterDisplay(sectionIndex, counterKey);
            }
        } else {
            console.error(`Failed to fetch counter for ${filePath}:`, response.statusText);
        }
    } catch (error) {
        console.error(`Error fetching counter for ${filePath}:`, error);
    }
}

// Generic function to fetch image path
async function fetchImage(filePath, sectionIndex) {
    try {
        const response = await fetch(`/api/image?path=${encodeURIComponent(filePath)}`);
        if (response.ok) {
            const data = await response.json();
            const imagePath = data.imagePath || '';
            
            if (!sectionData.has(sectionIndex)) {
                sectionData.set(sectionIndex, {});
            }
            const section = sectionData.get(sectionIndex);
            
            if (section.imagePath !== imagePath) {
                section.imagePath = imagePath;
                updateImageDisplay(sectionIndex);
            }
        } else {
            console.error(`Failed to fetch image for ${filePath}:`, response.statusText);
        }
    } catch (error) {
        console.error(`Error fetching image for ${filePath}:`, error);
    }
}

// Update counter display for a specific section
function updateCounterDisplay(sectionIndex, counterKey) {
    const section = sectionData.get(sectionIndex);
    if (!section) return;
    
    const sectionElement = document.querySelector(`[data-section-index="${sectionIndex}"]`);
    if (!sectionElement) return;
    
    const counterElement = sectionElement.querySelector(`[data-counter="${counterKey}"]`);
    if (counterElement) {
        const value = section[counterKey] || 0;
        counterElement.textContent = value.toLocaleString();
    }
    
    // Update ratio display if both counters exist
    const sectionConfig = sectionsConfig[sectionIndex];
    if (sectionConfig && sectionConfig.counter1 && sectionConfig.counter2) {
        updateRatioDisplay(sectionIndex);
    }
}

// Update ratio display for sections with two counters
function updateRatioDisplay(sectionIndex) {
    const section = sectionData.get(sectionIndex);
    if (!section) return;
    
    const sectionElement = document.querySelector(`[data-section-index="${sectionIndex}"]`);
    if (!sectionElement) return;
    
    const sectionConfig = sectionsConfig[sectionIndex];
    if (!sectionConfig) return;
    
    const counter1Element = sectionElement.querySelector('[data-counter="counter1"]');
    const counter2Element = sectionElement.querySelector('[data-counter="counter2"]');
    
    if (counter1Element) {
        const value1 = section.counter1 || 0;
        counter1Element.textContent = value1.toLocaleString();
    }
    
    if (counter2Element) {
        let value2;
        // If counter2 is a number, use it directly
        if (typeof sectionConfig.counter2 === 'number') {
            value2 = sectionConfig.counter2;
        } else {
            value2 = section.counter2 || 0;
        }
        counter2Element.textContent = value2.toLocaleString();
    }
}

// Update image display for a specific section
function updateImageDisplay(sectionIndex) {
    const section = sectionData.get(sectionIndex);
    if (!section) return;
    
    const sectionElement = document.querySelector(`[data-section-index="${sectionIndex}"]`);
    if (!sectionElement) return;
    
    const imageElement = sectionElement.querySelector('.section-image');
    if (imageElement) {
        if (section.imagePath && section.imagePath !== '') {
            imageElement.src = section.imagePath;
            imageElement.style.display = 'block';
        } else {
            imageElement.style.display = 'none';
        }
    }
}

// Render all sections dynamically
function renderSections() {
    const container = document.getElementById('tracker-container');
    if (!container) return;
    
    // Clear existing sections
    container.innerHTML = '';
    sectionData.clear();
    
    sectionsConfig.forEach((sectionConfig, index) => {
        // Create section element
        const sectionElement = document.createElement('div');
        sectionElement.className = 'section';
        sectionElement.setAttribute('data-section-index', index);
        
        // Create section title
        if (sectionConfig.title && sectionConfig.title !== null) {
            const titleElement = document.createElement('div');
            titleElement.className = 'section-title';
            titleElement.textContent = sectionConfig.title;
            sectionElement.appendChild(titleElement);
        }
        
        // Create section subtitle if provided
        if (sectionConfig.subtitle && sectionConfig.subtitle !== null) {
            const subtitleElement = document.createElement('div');
            subtitleElement.className = 'section-subtitle';
            subtitleElement.textContent = sectionConfig.subtitle;
            sectionElement.appendChild(subtitleElement);
        }
        
        // Determine if we need image and/or counters
        const hasImage = sectionConfig.image && sectionConfig.image !== null;
        const hasCounter1 = sectionConfig.counter1 && sectionConfig.counter1 !== null;
        const hasCounter2 = sectionConfig.counter2 !== null && sectionConfig.counter2 !== null;
        const hasTwoCounters = hasCounter1 && hasCounter2;
        
        // Create display container
        let displayElement;
        
        if (hasImage && (hasCounter1 || hasCounter2)) {
            // Image with counter(s) - use image-display style
            displayElement = document.createElement('div');
            displayElement.className = 'image-display';
            
            // Add image
            const imageElement = document.createElement('img');
            imageElement.className = 'section-sprite section-image';
            imageElement.src = '';
            imageElement.alt = sectionConfig.title || 'Image';
            imageElement.style.display = 'none';
            displayElement.appendChild(imageElement);
            
            // Add counter display
            if (hasTwoCounters) {
                const ratioDisplay = document.createElement('div');
                ratioDisplay.className = 'ratio-display';
                
                const counter1Span = document.createElement('span');
                counter1Span.setAttribute('data-counter', 'counter1');
                counter1Span.textContent = '0';
                ratioDisplay.appendChild(counter1Span);
                
                const separatorSpan = document.createElement('span');
                separatorSpan.className = 'ratio-separator';
                separatorSpan.textContent = sectionConfig.separator || '/';
                ratioDisplay.appendChild(separatorSpan);
                
                const counter2Span = document.createElement('span');
                counter2Span.setAttribute('data-counter', 'counter2');
                counter2Span.textContent = '0';
                ratioDisplay.appendChild(counter2Span);
                
                displayElement.appendChild(ratioDisplay);
            } else if (hasCounter1) {
                const counterDisplay = document.createElement('div');
                counterDisplay.className = 'counter-display';
                
                const counterSpan = document.createElement('span');
                counterSpan.setAttribute('data-counter', 'counter1');
                counterSpan.textContent = '0';
                counterDisplay.appendChild(counterSpan);
                
                displayElement.appendChild(counterDisplay);
            }
        } else if (hasImage) {
            // Image only - use image-display style
            displayElement = document.createElement('div');
            displayElement.className = 'image-display';
            
            const imageElement = document.createElement('img');
            imageElement.className = 'section-sprite section-image';
            imageElement.src = '';
            imageElement.alt = sectionConfig.title || 'Image';
            imageElement.style.display = 'none';
            displayElement.appendChild(imageElement);
        } else if (hasTwoCounters) {
            // Two counters - use ratio-display
            displayElement = document.createElement('div');
            displayElement.className = 'ratio-display';
            
            const counter1Span = document.createElement('span');
            counter1Span.setAttribute('data-counter', 'counter1');
            counter1Span.textContent = '0';
            displayElement.appendChild(counter1Span);
            
            const separatorSpan = document.createElement('span');
            separatorSpan.className = 'ratio-separator';
            separatorSpan.textContent = sectionConfig.separator || '/';
            displayElement.appendChild(separatorSpan);
            
            const counter2Span = document.createElement('span');
            counter2Span.setAttribute('data-counter', 'counter2');
            counter2Span.textContent = '0';
            displayElement.appendChild(counter2Span);
        } else if (hasCounter1) {
            // Single counter - use counter-display
            displayElement = document.createElement('div');
            displayElement.className = 'counter-display';
            
            const counterSpan = document.createElement('span');
            counterSpan.setAttribute('data-counter', 'counter1');
            counterSpan.textContent = '0';
            displayElement.appendChild(counterSpan);
        }
        
        if (displayElement) {
            sectionElement.appendChild(displayElement);
        }
        
        container.appendChild(sectionElement);
        
        // Initialize section data
        sectionData.set(index, {
            counter1: 0,
            counter2: 0,
            imagePath: ''
        });
    });
}

// Initialize the tracker
async function initializeTracker() {
    console.log('Aioli Overlay initialized');

    // Fetch sections configuration
    const configLoaded = await fetchSectionsConfig();
    if (!configLoaded) {
        console.error('Failed to load sections configuration');
        return;
    }

    // Render sections
    renderSections();

    clearPollingIntervals();

    // Set up initial fetches and polling for each section
    const initialFetches = [];

    sectionsConfig.forEach((sectionConfig, index) => {
        // Fetch image if configured
        if (sectionConfig.image && sectionConfig.image !== null) {
            initialFetches.push(fetchImage(sectionConfig.image, index));
            // Poll for image changes every 5 seconds
            pollingIntervals.push(setInterval(() => {
                fetchImage(sectionConfig.image, index);
            }, 5000));
        }

        // Fetch counter1 if configured and it's a file path
        if (sectionConfig.counter1 && sectionConfig.counter1 !== null && typeof sectionConfig.counter1 === 'string') {
            initialFetches.push(fetchCounter(sectionConfig.counter1, index, 'counter1'));
            // Poll for counter1 changes every 1 second
            pollingIntervals.push(setInterval(() => {
                fetchCounter(sectionConfig.counter1, index, 'counter1');
            }, 1000));
        }

        // Fetch counter2 if configured and it's a file path (not a number)
        if (sectionConfig.counter2 !== null && typeof sectionConfig.counter2 === 'string') {
            initialFetches.push(fetchCounter(sectionConfig.counter2, index, 'counter2'));
            // Poll for counter2 changes every 1 second
            pollingIntervals.push(setInterval(() => {
                fetchCounter(sectionConfig.counter2, index, 'counter2');
            }, 1000));
        } else if (typeof sectionConfig.counter2 === 'number') {
            // If counter2 is a number, set it directly and update display
            if (!sectionData.has(index)) {
                sectionData.set(index, {});
            }
            const section = sectionData.get(index);
            section.counter2 = sectionConfig.counter2;
            updateRatioDisplay(index);
        }
    });

    await Promise.all(initialFetches);
}

// Start the tracker when page loads
document.addEventListener('DOMContentLoaded', initializeTracker);

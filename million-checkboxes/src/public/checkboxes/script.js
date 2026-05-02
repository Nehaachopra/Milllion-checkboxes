const container = document.querySelector(".container");
const chat = document.querySelector(".chat");
const user = document.getElementById("user");
const socket = io();

async function getData() {
    try {
        const res = await fetch("/data");
        const {data} = await res.json();
        return data;
    }
    catch (err) {
        return [];
    }
}

class CheckboxGrid {
    constructor(checks = []) {
        // Configuration
        this.TOTAL_CHECKBOXES = 1_000_000;
        this.CHECKBOXES_PER_ROW = this.calculateCheckboxesPerRow();
        this.TOTAL_ROWS = Math.ceil(this.TOTAL_CHECKBOXES / this.CHECKBOXES_PER_ROW);
        this.BUFFER_ROWS = 5; // Extra rows to render above/below viewport
        
        // DOM elements
        this.viewport = document.getElementById('viewport');
        this.scrollContainer = document.getElementById('scrollContainer');
        this.gridContainer = document.getElementById('gridContainer');
        this.checkedCountEl = document.getElementById('checkedCount');
        this.progressPercentEl = document.getElementById('progressPercent');
        
        // State management
        this.checkedBoxes = new Set(checks); // Efficient O(1) lookup
        this.checkboxPool = []; // Reusable DOM elements
        this.activeCheckboxes = new Map(); // Currently rendered checkboxes
        this.currentVisibleRange = { start: 0, end: 0 };
        
        // Performance tracking
        this.lastScrollTime = 0;
        this.scrollTimeout = null;
        this.rafId = null;
        
        // Calculate dimensions
        this.calculateDimensions();
        this.init();
    }
    
    /**
     * Calculate how many checkboxes fit per row based on viewport width
     */
    calculateCheckboxesPerRow() {
        const viewportWidth = window.innerWidth;
        const style = getComputedStyle(document.documentElement);
        
        // Get checkbox size and gap from CSS variables
        let checkboxSize = 28;
        let checkboxGap = 6;
        
        if (viewportWidth <= 480) {
            checkboxSize = 18;
            checkboxGap = 3;
        } else if (viewportWidth <= 768) {
            checkboxSize = 22;
            checkboxGap = 4;
        }
        
        const containerPadding = viewportWidth <= 480 ? 16 : viewportWidth <= 768 ? 32 : 48;
        const availableWidth = viewportWidth - containerPadding;
        const checkboxTotalSize = checkboxSize + checkboxGap;
        
        return Math.floor(availableWidth / checkboxTotalSize);
    }
    
    /**
     * Calculate all dimension-related values
     */
    calculateDimensions() {
        const style = getComputedStyle(document.documentElement);
        const viewportWidth = window.innerWidth;
        
        if (viewportWidth <= 480) {
            this.checkboxSize = 18;
            this.checkboxGap = 3;
        } else if (viewportWidth <= 768) {
            this.checkboxSize = 22;
            this.checkboxGap = 4;
        } else {
            this.checkboxSize = 28;
            this.checkboxGap = 6;
        }
        
        this.rowHeight = this.checkboxSize + this.checkboxGap;
        this.viewportHeight = this.viewport.clientHeight;
        this.visibleRows = Math.ceil(this.viewportHeight / this.rowHeight) + this.BUFFER_ROWS * 2;
        
        // Set total height for scrolling
        const totalHeight = this.TOTAL_ROWS * this.rowHeight;
        this.gridContainer.style.height = `${totalHeight}px`;
    }
    
    /**
     * Initialize the grid
     */
    init() {
        // Render initial visible range
        this.updateVisibleRange();
        
        // Event listeners
        this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Delegate click events for performance
        this.gridContainer.addEventListener('click', this.handleCheckboxClick.bind(this));
        
        // Initial render
        this.render();
    }
    
    /**
     * Handle scroll events with throttling
     */
    handleScroll() {
        const now = Date.now();
        
        // Cancel any pending render
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Use requestAnimationFrame for smooth scrolling
        this.rafId = requestAnimationFrame(() => {
            this.updateVisibleRange();
            this.render();
        });
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            // Recalculate everything
            this.CHECKBOXES_PER_ROW = this.calculateCheckboxesPerRow();
            this.TOTAL_ROWS = Math.ceil(this.TOTAL_CHECKBOXES / this.CHECKBOXES_PER_ROW);
            this.calculateDimensions();
            
            // Clear and re-render
            this.clearAllCheckboxes();
            this.updateVisibleRange();
            this.render();
        }, 150);
    }
    
    /**
     * Calculate which rows should be visible
     */
    updateVisibleRange() {
        const scrollTop = this.scrollContainer.scrollTop;
        const startRow = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.BUFFER_ROWS);
        const endRow = Math.min(this.TOTAL_ROWS, startRow + this.visibleRows);
        
        this.currentVisibleRange = { start: startRow, end: endRow };
    }
    
    /**
     * Render visible checkboxes
     */
    render() {
        const { start, end } = this.currentVisibleRange;
        const newActiveSet = new Set();
        
        // Render rows in visible range
        for (let row = start; row < end; row++) {
            const startIdx = row * this.CHECKBOXES_PER_ROW;
            const endIdx = Math.min(startIdx + this.CHECKBOXES_PER_ROW, this.TOTAL_CHECKBOXES);
            
            for (let idx = startIdx; idx < endIdx; idx++) {
                newActiveSet.add(idx);
                
                if (!this.activeCheckboxes.has(idx)) {
                    this.renderCheckbox(idx, row);
                }
            }
        }
        
        // Remove checkboxes that are no longer visible
        for (const [idx, element] of this.activeCheckboxes.entries()) {
            if (!newActiveSet.has(idx)) {
                this.recycleCheckbox(idx, element);
            }
        }
    }
    
    /**
     * Render a single checkbox
     */
    renderCheckbox(index, row) {
        const col = index % this.CHECKBOXES_PER_ROW;
        const element = this.getCheckboxElement();
        
        // Position
        const x = col * (this.checkboxSize + this.checkboxGap);
        const y = row * this.rowHeight;
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.dataset.index = index;
        
        // Color
        const color = this.getColorForIndex(index);
        element.style.backgroundColor = this.checkedBoxes.has(index) ? color : '#e8e3d9';
        
        // Checked state
        if (this.checkedBoxes.has(index)) {
            element.classList.add('checked');
        } else {
            element.classList.remove('checked');
        }
        
        // Add to DOM and tracking
        this.gridContainer.appendChild(element);
        this.activeCheckboxes.set(index, element);
    }
    
    /**
     * Get a checkbox element from pool or create new one
     */
    getCheckboxElement() {
        if (this.checkboxPool.length > 0) {
            return this.checkboxPool.pop();
        }
        
        const element = document.createElement('div');
        element.className = 'checkbox';
        return element;
    }
    
    /**
     * Recycle checkbox element back to pool
     */
    recycleCheckbox(index, element) {
        element.remove();
        this.activeCheckboxes.delete(index);
        this.checkboxPool.push(element);
    }
    
    /**
     * Clear all rendered checkboxes
     */
    clearAllCheckboxes() {
        for (const [idx, element] of this.activeCheckboxes.entries()) {
            element.remove();
            this.checkboxPool.push(element);
        }
        this.activeCheckboxes.clear();
    }
    
    /**
     * Handle checkbox click
     */
    handleCheckboxClick(event) {
        const checkbox = event.target.closest('.checkbox');
        if (!checkbox) return;

        const now = new Date();

        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        
        const index = parseInt(checkbox.dataset.index, 10);
        if (checkbox.classList.contains('checked')) {
            this.uncheckTheBox(checkbox);
            socket.emit("client:updated", {index, checked: false, user: user.textContent, userID: user.id, time})
        }

        else {
            this.checkTheBox(checkbox);
            socket.emit("client:updated", {index, checked: true, user: user.textContent, userID: user.id, time})
        }
    }

    checkTheBox(checkbox) {
        const index = parseInt(checkbox.dataset.index, 10);
        this.checkedBoxes.add(index);

        const color = this.getColorForIndex(index);
        checkbox.style.backgroundColor = color;
        checkbox.classList.add('checked');
        
        this.updateStats();
    }

    uncheckTheBox(checkbox) {
        const index = parseInt(checkbox.dataset.index, 10);
        this.checkedBoxes.delete(index);

        checkbox.style.backgroundColor = '#e8e3d9';
        checkbox.classList.remove('checked');

        this.updateStats();
    }
    
    /**
     * Generate smooth color progression using HSL
     * Creates a rainbow gradient that smoothly transitions across all 1M boxes
     */
    getColorForIndex(index) {
        // Normalize index to 0-1 range
        const t = index / this.TOTAL_CHECKBOXES;
        
        // Multi-phase color progression for visual richness
        // Phase 1: Hue rotation (0-360 degrees) - creates rainbow effect
        const hueRotations = 2.5; // Multiple rotations for variety
        const hue = (t * 360 * hueRotations) % 360;
        
        // Phase 2: Saturation curve - start vibrant, dip in middle, end vibrant
        const saturationMid = 0.5;
        const saturationAmplitude = 0.3;
        const saturation = 65 + saturationAmplitude * 30 * Math.sin(t * Math.PI * 2);
        
        // Phase 3: Lightness curve - creates depth variation
        // Lighter at beginning and end, darker in middle for dramatic effect
        const lightnessCurve = 0.5 + 0.15 * Math.sin(t * Math.PI * 3);
        const lightness = 45 + lightnessCurve * 20;
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    /**
     * Update statistics display
     */
    updateStats() {
        const count = this.checkedBoxes.size;
        const percent = (count / this.TOTAL_CHECKBOXES * 100).toFixed(2);
        
        this.checkedCountEl.textContent = count.toLocaleString();
        this.progressPercentEl.textContent = `${percent}%`;
    }
}

// function addMessage(name, time, checked) {
//   const item = document.createElement("div");
//   item.className = "chat-item enter";

//   item.innerHTML = `
//     <p class="chat-text"><span class="user">${name}</span>
//     ${checked? "checked" : "unchecked"}</p>
//     <p class="chat-time">${time}</p>
//   `;

//   // Add new message at bottom
//   chat.appendChild(item);

//   // 🔥 trigger entry animation
//   requestAnimationFrame(() => {
//     item.classList.add("enter-active");
//   });

//   // 🔥 REMOVE OLD if more than 4
//   if (chat.children.length > 4) {
//     const first = chat.children[0];

//     first.classList.add("exit");

//     requestAnimationFrame(() => {
//       first.classList.add("exit-active");
//     });

//     setTimeout(() => {
//       first.remove();
//     }, 250);
//   }
// }

function addMessage(name, time, checked) {
  const item = document.createElement("div");
  item.className = "chat-item enter";

  item.innerHTML = `
    <p class="chat-text"><span class="user">${name}</span>
    ${checked ? "checked" : "unchecked"}</p>
    <p class="chat-time">${time}</p>
  `;

  chat.appendChild(item);

  // 🔥 entry animation
  requestAnimationFrame(() => {
    item.classList.add("enter-active");
  });

  // 🔥 AUTO REMOVE AFTER 2s
  setTimeout(() => {
    item.classList.add("exit");

    requestAnimationFrame(() => {
      item.classList.add("exit-active");
    });

    setTimeout(() => {
      item.remove();
    }, 250); // match CSS animation
  }, 2000);

  // 🔥 KEEP MAX 4 (same logic)
  if (chat.children.length > 4) {
    const first = chat.children[0];

    first.classList.add("exit");

    requestAnimationFrame(() => {
      first.classList.add("exit-active");
    });

    setTimeout(() => {
      first.remove();
    }, 250);
  }
}

function showWarning(message = "Too many clicks at a time!") {
  const el = document.querySelector(".warning");

  el.textContent = message;

  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2000); // disappears after 2s
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async() => {
    const response = await fetch("/me", {
      credentials: "include" 
    });
    if (!response.ok) {
        await fetch("/error");
    }
    
    else {
        const userInfo = await response.json();
        const userData = userInfo.data;
        user.textContent = userData.given_name;
        user.id = userData.sub;
        const checks = await getData();
        const checkBoxGrid = new CheckboxGrid(checks);

        socket.on("server:updated", (data) => {
            const checkbox = checkBoxGrid.gridContainer.querySelector(`.checkbox[data-index="${data.index}"]`);
            if (checkbox) {
                if (data.checked) {
                    checkBoxGrid.checkTheBox(checkbox);
                    if (data.userID && data.userID !== user.id) {
                        addMessage(data.user, data.time, true);
                    }
                }
                else {
                    checkBoxGrid.uncheckTheBox(checkbox);
                    if (data.userID && data.userID !== user.id) {
                        addMessage(data.user, data.time, false);
                    }
                }
            }
            else {
                console.log("Could not find updated checkbox");
            }
        })

        socket.on("server:warning", async(data) => {
            showWarning(data.error);
            const checkbox = checkBoxGrid.gridContainer.querySelector(`.checkbox[data-index="${data.index}"]`);
            checkBoxGrid.uncheckTheBox(checkbox);
        })
    }
});
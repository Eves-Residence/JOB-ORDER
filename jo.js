const sheetURL = "https://script.google.com/macros/s/AKfycbw-nMYpLS2Rcx8WCVpijJMfW_HmPOxCPhnEaa-DPXqxMwZ_Pl8Qy8iGdz_KHZGR9Nu-/exec";

let allJobOrders = [];
const jobOrderList = document.getElementById("taskList");
const filterContainer = document.getElementById("filterContainer");

// 1a. Create Main Unified Filter Dropdown
const mainFilter = document.createElement("select");
mainFilter.id = "mainFilter";
mainFilter.style.padding = "8px";
mainFilter.style.borderRadius = "8px";
mainFilter.style.border = "1px solid #ccc";
mainFilter.style.fontWeight = "600";

mainFilter.innerHTML = `
  <option value="all">Show All Tasks</option>
  <optgroup label="Status">
    <option value="J.O STATUS:Not Started">Status: Pending</option>
    <option value="J.O STATUS:In Progress">Status: Ongoing</option>
    <option value="J.O STATUS:Completed">Status: Completed</option>
    <option value="J.O STATUS:Cancelled">Status: Cancelled</option>
  </optgroup>
  <optgroup label="Priority">
    <option value="PRIORITY:High">Priority: High</option>
    <option value="PRIORITY:Medium">Priority: Medium</option>
    <option value="PRIORITY:Low">Priority: Low</option>
  </optgroup>
  <optgroup label="Property">
    <option value="PROPERTY:ECO 1">Property: ECO 1</option>
    <option value="PROPERTY:ECO 2">Property: ECO 2</option>
    <option value="PROPERTY:GREEN">Property: GREEN</option>
    <option value="PROPERTY:HOMEY">Property: HOMEY</option>
    <option value="PROPERTY:ADI 168">Property: ADI 168</option>
    <option value="PROPERTY:KALAYAAN">Property: KALAYAAN</option>
    <option value="PROPERTY:PLEASANT">Property: PLEASANT</option>
    <option value="PROPERTY:DREAM">Property: DREAM</option>
    <option value="PROPERTY:PENTHAUZ">Property: PENTHAUZ</option>
    <option value="PROPERTY:BED AND BATH">Property: BED AND BATH</option>
  </optgroup>
`;

// 1b. Create Search Input
const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.placeholder = "Search JO #...";
searchInput.style.padding = "8px";
searchInput.style.borderRadius = "8px";
searchInput.style.border = "1px solid #ccc";
searchInput.style.marginLeft = "10px"; 
searchInput.style.width = "140px"; 

// Inject Controls on Load
document.addEventListener("DOMContentLoaded", () => {
  if(filterContainer) {
    filterContainer.innerHTML = ""; 
    filterContainer.style.display = "flex";
    filterContainer.style.alignItems = "center";
    filterContainer.appendChild(mainFilter);
    filterContainer.appendChild(searchInput);
  }
  fetchJobOrders();
});

// 2. Parse TSV Data
function parseTSV(tsv) {
  const lines = tsv.trim().split("\n");
  const headers = lines.shift().split("\t").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split("\t");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });
    return obj;
  });
}

// 3. Fetch Data
async function fetchJobOrders() {
  try {
    const res = await fetch(sheetURL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tsvText = await res.text();
    allJobOrders = parseTSV(tsvText);
    renderJobOrders();
  } catch (err) {
    console.error("Fetch error:", err);
    if(jobOrderList) jobOrderList.innerHTML = "<p style='text-align:center; color:black; font-weight:bold;'>Error connecting to database.</p>";
  }
}

// 4. Render Cards
function renderJobOrders() {
  if (!jobOrderList) return;

  if (!allJobOrders.length) {
    jobOrderList.innerHTML = "<p style='text-align:center; color:black;'>No job orders found.</p>";
    return;
  }

  // Calculate Next JO Number
  let lastJO = "25-0000";
  allJobOrders.forEach(job => {
     if(job["JOB ORDER NUMBER"]) lastJO = job["JOB ORDER NUMBER"];
  });
  const parts = lastJO.split("-");
  const nextJO = "25-" + (parseInt(parts[1], 10) + 1).toString().padStart(4, "0");

  // --- FILTER LOGIC ---
  const filterValue = mainFilter.value; 
  const searchValue = searchInput.value.trim().toLowerCase();
  
  const filtered = allJobOrders.filter(t => {
      let matchesCategory = true;
      if (filterValue !== "all") {
          const [category, val] = filterValue.split(":");
          if (category === "J.O STATUS") {
              matchesCategory = (t["J.O STATUS"] || "").toUpperCase() === val.toUpperCase();
          } else {
              matchesCategory = (t[category] || "").toUpperCase() === val.toUpperCase();
          }
      }
      let matchesSearch = true;
      if (searchValue) {
          const joNum = (t["JOB ORDER NUMBER"] || "").toLowerCase();
          matchesSearch = joNum.includes(searchValue);
      }
      return matchesCategory && matchesSearch;
  });

  jobOrderList.innerHTML = "";

  // Display Next JO
  const nextDiv = document.createElement("div");
  nextDiv.style.padding = "10px";
  nextDiv.style.textAlign = "right";
  nextDiv.style.fontSize = "12px";
  nextDiv.style.color = "#000"; 
  nextDiv.style.fontWeight = "bold";
  nextDiv.textContent = `Next System JO: ${nextJO}`;
  jobOrderList.appendChild(nextDiv);

  if (filtered.length === 0) {
      jobOrderList.innerHTML += "<p style='text-align:center; padding:20px;'>No tasks match your search/filter.</p>";
      return;
  }

  // --- LOOP AND CREATE CARDS ---
  filtered.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("task-card");
    div.style.position = "relative"; 

    const uniqueID = `card-${t["JOB ORDER NUMBER"]}`;
    div.id = uniqueID;

    // --- APPLY STATUS CLASS AND BORDER COLOR TO MAIN CARD ---
    const statusVal = (t["J.O STATUS"] || "Not Started").trim();
    const statusUpper = statusVal.toUpperCase();
    const statusClass = statusVal.toLowerCase().replace(/\s+/g, '-');
    if (statusClass) {
        div.classList.add(`status-${statusClass}`);
    }

    // Set Border Color Based on Status as requested (Case-Insensitive)
    let borderColor = "#ddd"; // Default
    if (statusUpper === "COMPLETED") borderColor = "#22C55E"; // Green
    else if (statusUpper === "NOT STARTED") borderColor = "#FBBF24"; // Yellow
    else if (statusUpper === "IN PROGRESS") borderColor = "#F97316"; // Orange
    else if (statusUpper === "CANCELLED") borderColor = "#EF4444"; // Red
    
    div.style.borderLeft = `6px solid ${borderColor}`;

    // Visual helper for Payment Status
    const payStatus = (t["PAYMENT STATUS"] || "UNPAID").toUpperCase();
    let payStatusClass = "";
    if(payStatus === "PAID") payStatusClass = "status-completed";
    else if(payStatus === "UNPAID") payStatusClass = "status-unpaid";

    const headerTitle = `JO #${t["JOB ORDER NUMBER"]} | ${t["PROPERTY"] || "N/A"} | ${t["UNIT NUMBER"]} | ${t["TENANTS NAME"]}`;
    
    div.innerHTML = `
      <button onclick="downloadCardAsPDF('${uniqueID}', '${t["JOB ORDER NUMBER"]}')" 
              data-html2canvas-ignore="true"
              style="position: absolute; top: 15px; right: 15px; z-index: 100; background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        <i class="fas fa-file-pdf"></i> PDF
      </button>

      <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; padding-right: 60px;">
          <h3 class="card-title" style="margin: 0;">${headerTitle}</h3>
      </div>
      
      <div class="meta-info">
        <div style="margin-bottom: 8px; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
            <div>
                <strong>J.O. Status:</strong> 
                <select class="status-dropdown status-${statusClass}" onchange="updateStatus('${t["JOB ORDER NUMBER"]}', this.value, this)">
                    <option value="Not Started" ${statusUpper === "NOT STARTED" ? "selected" : ""}>Pending</option>
                    <option value="In Progress" ${statusUpper === "IN PROGRESS" ? "selected" : ""}>Ongoing</option>
                    <option value="Completed" ${statusUpper === "COMPLETED" ? "selected" : ""}>Completed</option>
                    <option value="Cancelled" ${statusUpper === "CANCELLED" ? "selected" : ""}>Cancelled</option>
                </select>
            </div>
            <div>
                <strong>Payment Status:</strong> 
                <select id="pay-status-${t["JOB ORDER NUMBER"]}" class="status-dropdown ${payStatusClass}" onchange="updatePayment('${t["JOB ORDER NUMBER"]}', this.value, document.getElementById('amount-${t["JOB ORDER NUMBER"]}').value, this)">
                    <option value="UNPAID" ${payStatus === "UNPAID" ? "selected" : ""}>UNPAID</option>
                    <option value="PAID" ${payStatus === "PAID" ? "selected" : ""}>PAID</option>
                    <option value="NO FEES" ${payStatus === "NO FEES" ? "selected" : ""}>NO FEES</option>
                </select>
            </div>
            <div>
                <strong>Amount Paid:</strong> ₱<input type="number" id="amount-${t["JOB ORDER NUMBER"]}" value="${t["AMOUNT PAID"] || 0}" style="width: 80px; padding: 4px; border-radius: 4px; border: 1px solid #ccc; font-weight: 600;" onchange="updatePayment('${t["JOB ORDER NUMBER"]}', document.getElementById('pay-status-${t["JOB ORDER NUMBER"]}').value, this.value)">
            </div>
        </div>

        <p><strong>Request Date:</strong> ${t["REQUEST DATE"]}</p>
        <p><strong>Contact:</strong> ${t["CONTACT NUMER"]}</p>
        <p><strong>Priority:</strong> ${t["PRIORITY"] || "Normal"}</p>
        
        <hr style="margin: 10px 0; border: 0; border-top: 1px dashed #ccc;">

        <p><strong>Description:</strong> ${t["REPAIR DESCRIPTION"] || "No Description"}</p>
        <p><strong>Assessment:</strong> ${t["ASSESSMENT DATE"]} ${t["ASSESSMENT TIME"]}</p>
        <p><strong>Repair:</strong> ${t["REPAIR DATE"]} ${t["REPAIR TIME"]}</p>
        <p><strong>Materials:</strong> ${t["MATERIALS"] || "None"}</p>
        <p><strong>Date Completed:</strong> ${t["DATE COMPLETED"] || "None"}</p>
        
        <div style="margin-top: 15px; font-size: 11px; background: #f9f9f9; padding: 8px; border-radius: 5px;">
             <strong>Signatures:</strong><br>
             Tenant: ${t["TENANT'S SIGNITURE"] || "Pending"} <br>
             Property Rep: ${t["PROPERTY REPRESENTATIVE SIGNITURE"] || "Pending"} <br>
             Maintenance: ${t["MAINTENANCE SIGNITURE"] || "Pending"}
        </div>
      </div>
    `;

    jobOrderList.appendChild(div);
  });
}

// Listeners
mainFilter.addEventListener("change", fetchJobOrders);
searchInput.addEventListener("input", renderJobOrders); 
setInterval(fetchJobOrders, 30000);

// Function to Send Status Update
function updateStatus(joNumber, newStatus, element) {
    // 1. OPTIMISTIC UPDATE: Update the local data array immediately
    const jobIndex = allJobOrders.findIndex(job => job["JOB ORDER NUMBER"] === joNumber);
    if (jobIndex !== -1) {
        allJobOrders[jobIndex]["J.O STATUS"] = newStatus;
        if (newStatus === "Completed") {
            allJobOrders[jobIndex]["DATE COMPLETED"] = new Date().toLocaleDateString();
        }
    }

    // 2. IMMEDIATE UI REFRESH
    renderJobOrders();

    // 3. BACKGROUND SYNC
    const payload = { joNumber: joNumber, status: newStatus };
    if (newStatus === "Completed") {
        payload.dateCompleted = new Date().toLocaleDateString(); 
    }

    fetch(sheetURL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(async response => {
        if (!response.ok) throw new Error("Server error during update");
        console.log("Sheet Update Success. Waiting 2s for TSV refresh...");
        // DELAY RE-FETCH: Give Google time to refresh the published TSV file
        setTimeout(fetchJobOrders, 2000);
    })
    .catch(error => { 
        console.error("Error updating status:", error);
        fetchJobOrders(); // Revert on failure
    });
}

// Function to Send Payment Update
function updatePayment(joNumber, status, amount, element) {
    // 1. OPTIMISTIC UPDATE
    const jobIndex = allJobOrders.findIndex(job => job["JOB ORDER NUMBER"] === joNumber);
    if (jobIndex !== -1) {
        allJobOrders[jobIndex]["PAYMENT STATUS"] = status;
        allJobOrders[jobIndex]["AMOUNT PAID"] = amount;
    }
    renderJobOrders();

    const payload = { 
        joNumber: joNumber, 
        paymentStatus: status, 
        amountPaid: parseFloat(amount) || 0 
    };

    fetch(sheetURL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(async response => {
        if (!response.ok) throw new Error("Server error during payment update");
        console.log("Payment Update Success. Waiting 2s for TSV refresh...");
        setTimeout(fetchJobOrders, 2000);
    })
    .catch(error => { 
        console.error("Error updating payment:", error);
        fetchJobOrders();
    });
}

async function downloadCardAsPDF(elementId, joNumber) {
    const element = document.getElementById(elementId);
    if (!element) return;
    if (typeof html2pdf === 'undefined') return;

    const opt = {
        margin: 0.5,
        filename: `JobOrder_${joNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF Export failed:", err);
    }
}

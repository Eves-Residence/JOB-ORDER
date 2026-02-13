const sheetURL = "https://script.google.com/macros/s/AKfycbxvfpbvl-5-J7iFsGMZzNtwX0dj-_n9XOgb6ieB9RZa9Sbbu86h4OyERG2UtJFnvzVO/exec";

let allJobOrders = [];
let isEditing = false; // NEW: Lock to prevent refresh while typing
const jobOrderList = document.getElementById("taskList");
const filterContainer = document.getElementById("filterContainer");

// --- HELPER: Convert Sheet Date (MM/DD/YYYY) to Input Date (YYYY-MM-DD) ---
function formatForInput(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === "none" || dateStr.trim() === "") return "";
    if (dateStr.includes("-")) return dateStr; 
    const parts = dateStr.split("/");
    if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

// 1a. Create Main Unified Filter Dropdown
const mainFilter = document.createElement("select");
mainFilter.id = "mainFilter";
mainFilter.style.cssText = "padding:8px; border-radius:8px; border:1px solid #ccc; font-weight:600;";
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

const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.placeholder = "Search JO #...";
searchInput.style.cssText = "padding:8px; border-radius:8px; border:1px solid #ccc; margin-left:10px; width:140px;";

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

function parseTSV(tsv) {
  const lines = tsv.trim().split("\n");
  const headers = lines.shift().split("\t").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split("\t");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim(); });
    return obj;
  });
}

async function fetchJobOrders() {
  if (isEditing) return; // DON'T REFRESH IF USER IS TYPING
  try {
    const res = await fetch(sheetURL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tsvText = await res.text();
    allJobOrders = parseTSV(tsvText);
    renderJobOrders();
  } catch (err) { console.error("Fetch error:", err); }
}

function renderJobOrders() {
  if (!jobOrderList) return;
  const filterValue = mainFilter.value; 
  const searchValue = searchInput.value.trim().toLowerCase();
  
  const filtered = allJobOrders.filter(t => {
      let matchesCategory = (filterValue === "all");
      if (!matchesCategory) {
          const [category, val] = filterValue.split(":");
          matchesCategory = (t[category] || "").toUpperCase() === val.toUpperCase();
      }
      const matchesSearch = (t["JOB ORDER NUMBER"] || "").toLowerCase().includes(searchValue);
      return matchesCategory && matchesSearch;
  });

  jobOrderList.innerHTML = "";

  // Calculate Next JO Number (Fixed for 2026)
  let lastJO = "26-0000";
  allJobOrders.forEach(job => { if(job["JOB ORDER NUMBER"]) lastJO = job["JOB ORDER NUMBER"]; });
  const parts = lastJO.split("-");
  const nextJO = "26-" + (parseInt(parts[1], 10) + 1).toString().padStart(4, "0");

  const nextDiv = document.createElement("div");
  nextDiv.style.cssText = "padding:10px; text-align:right; font-size:12px; color:#000; font-weight:bold;";
  nextDiv.textContent = `Next System JO: ${nextJO}`;
  jobOrderList.appendChild(nextDiv);

  filtered.forEach(t => {
    const joNum = t["JOB ORDER NUMBER"];
    const div = document.createElement("div");
    div.classList.add("task-card");
    div.id = `card-${joNum}`;

    const statusVal = (t["J.O STATUS"] || "Not Started").trim();
    const statusUpper = statusVal.toUpperCase();
    const statusClass = statusVal.toLowerCase().replace(/\s+/g, '-');
    if (statusClass) div.classList.add(`status-${statusClass}`);

    let borderColor = "#ddd"; 
    if (statusUpper === "COMPLETED") borderColor = "#22C55E"; 
    else if (statusUpper === "NOT STARTED") borderColor = "#FBBF24"; 
    else if (statusUpper === "IN PROGRESS") borderColor = "#F97316"; 
    else if (statusUpper === "CANCELLED") borderColor = "#EF4444"; 
    div.style.borderLeft = `6px solid ${borderColor}`;

    const payStatus = (t["PAYMENT STATUS"] || "UNPAID").toUpperCase();
    let payStatusClass = payStatus === "PAID" ? "status-completed" : "status-unpaid";

    div.innerHTML = `
      <button onclick="downloadCardAsPDF('card-${joNum}', '${joNum}')" data-html2canvas-ignore="true"
              style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;">
        PDF
      </button>

      <div style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; padding-right: 60px;">
          <h3 class="card-title" style="margin: 0;">JO #${joNum} | ${t["PROPERTY"]} | ${t["UNIT NUMBER"]} | ${t["TENANTS NAME"]}</h3>
      </div>
      
      <div class="meta-info">
        <div style="margin-bottom: 8px; display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
            <div>
                <strong>Status:</strong> 
                <select class="status-dropdown status-${statusClass}" onchange="updateStatus('${joNum}', this.value, this)">
                    <option value="Not Started" ${statusUpper === "NOT STARTED" ? "selected" : ""}>Pending</option>
                    <option value="In Progress" ${statusUpper === "IN PROGRESS" ? "selected" : ""}>Ongoing</option>
                    <option value="Completed" ${statusUpper === "COMPLETED" ? "selected" : ""}>Completed</option>
                    <option value="Cancelled" ${statusUpper === "CANCELLED" ? "selected" : ""}>Cancelled</option>
                </select>
            </div>
            <div>
                <strong>Amount Paid:</strong> ₱<input type="number" id="amount-${joNum}" value="${t["AMOUNT PAID"] || 0}" 
                    onfocus="isEditing=true" onblur="isEditing=false"
                    style="width: 80px; padding: 4px; border-radius: 4px; border: 1px solid #ccc;" onchange="updatePayment('${joNum}', document.getElementById('pay-status-${joNum}').value, this.value)">
            </div>
        </div>

        <p><strong>Description:</strong> ${t["REPAIR DESCRIPTION"] || "No Description"}</p>
        
        <div style="margin-bottom:8px;">
            <strong>Assessment:</strong> 
            <input type="date" id="assess-date-${joNum}" value="${formatForInput(t["ASSESSMENT DATE"])}" onfocus="isEditing=true" onblur="isEditing=false" onchange="updateJobDetails('${joNum}')" style="font-size:12px; border:1px solid #ddd; border-radius:4px; padding:2px;">
            <input type="time" id="assess-time-${joNum}" value="${t["ASSESSMENT TIME"] || ""}" onfocus="isEditing=true" onblur="isEditing=false" onchange="updateJobDetails('${joNum}')" style="font-size:12px; border:1px solid #ddd; border-radius:4px; padding:2px;">
        </div>

        <div style="margin-bottom:8px;">
            <strong>Repair Schedule:</strong> 
            <input type="date" id="repair-date-${joNum}" value="${formatForInput(t["REPAIR DATE"])}" onfocus="isEditing=true" onblur="isEditing=false" onchange="updateJobDetails('${joNum}')" style="font-size:12px; border:1px solid #ddd; border-radius:4px; padding:2px;">
            <input type="time" id="repair-time-${joNum}" value="${t["REPAIR TIME"] || ""}" onfocus="isEditing=true" onblur="isEditing=false" onchange="updateJobDetails('${joNum}')" style="font-size:12px; border:1px solid #ddd; border-radius:4px; padding:2px;">
        </div>

        <div style="margin-bottom:8px;">
            <strong>Materials Used:</strong><br>
            <textarea id="materials-${joNum}" onfocus="isEditing=true" onblur="isEditing=false" onchange="updateJobDetails('${joNum}')" 
                style="width: 100%; min-height: 60px; resize: vertical; font-size:12px; border:1px solid #ddd; border-radius:4px; padding:5px; margin-top:4px; outline: none;" 
                placeholder="Enter materials used...">${t["MATERIALS"] || ""}</textarea>
        </div>

        <p><strong>Date Completed:</strong> ${t["DATE COMPLETED"] || "None"}</p>
        <div style="margin-top: 15px; font-size: 11px; background: #f9f9f9; padding: 8px; border-radius: 5px;">
             <strong>Signatures:</strong><br>
             Tenant: ${t["TENANT'S SIGNITURE"] || "Pending"} | Rep: ${t["PROPERTY REPRESENTATIVE SIGNITURE"] || "Pending"} | Maintenance: ${t["MAINTENANCE SIGNITURE"] || "Pending"}
        </div>
      </div>
    `;
    jobOrderList.appendChild(div);
  });
}

// --- SYNC FUNCTIONS ---

function updateStatus(joNumber, newStatus, element) {
    const jobIndex = allJobOrders.findIndex(j => j["JOB ORDER NUMBER"] === joNumber);
    if (jobIndex !== -1) {
        allJobOrders[jobIndex]["J.O STATUS"] = newStatus;
        if (newStatus === "Completed") allJobOrders[jobIndex]["DATE COMPLETED"] = new Date().toLocaleDateString();
    }
    renderJobOrders();
    fetch(sheetURL, { method: "POST", body: JSON.stringify({ joNumber, status: newStatus, dateCompleted: newStatus === "Completed" ? new Date().toLocaleDateString() : null }) })
    .then(() => { isEditing = false; setTimeout(fetchJobOrders, 2000); });
}

function updatePayment(joNumber, status, amount) {
    fetch(sheetURL, { method: "POST", body: JSON.stringify({ joNumber, paymentStatus: status, amountPaid: parseFloat(amount) || 0 }) })
    .then(() => { isEditing = false; setTimeout(fetchJobOrders, 2000); });
}

function updateJobDetails(joNumber) {
    const payload = { 
        joNumber: joNumber, 
        assessmentDate: document.getElementById(`assess-date-${joNumber}`).value,
        assessmentTime: document.getElementById(`assess-time-${joNumber}`).value,
        repairDate: document.getElementById(`repair-date-${joNumber}`).value,
        repairTime: document.getElementById(`repair-time-${joNumber}`).value,
        materials: document.getElementById(`materials-${joNumber}`).value
    };

    fetch(sheetURL, { method: "POST", body: JSON.stringify(payload) })
    .then(() => {
        console.log("Saved.");
        // DO NOT RENDER HERE, it will snap the focus away from the user
    });
}

async function downloadCardAsPDF(elementId, joNumber) {
    const element = document.getElementById(elementId);
    if (!element || typeof html2pdf === 'undefined') return;
    const opt = { margin: 0.5, filename: `JO_${joNumber}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    await html2pdf().set(opt).from(element).save();
}

mainFilter.addEventListener("change", fetchJobOrders);
searchInput.addEventListener("input", renderJobOrders); 
setInterval(fetchJobOrders, 30000);
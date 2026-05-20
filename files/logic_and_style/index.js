`use strict`

const saveFile = JSON.parse(localStorage.getItem("JustHex_saveFile")) || {
    row_length:16,
    group_size:4
};
localStorage.setItem("JustHex_saveFile",JSON.stringify(saveFile));

const allowed_chars = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","A","B","C","D","E","F"]
const generated_regex = new RegExp(`[^${allowed_chars}]`,'g');

let file_ids = {};  

const remoteForm = document.getElementById("remoteForm");
const fileInput = document.getElementById("openButton");
const download_form = document.getElementById("downloadForm");
const search_form = document.getElementById("searchForm");
const settings_form = document.getElementById("settingsForm");
document.getElementById("rowSize").value = String(saveFile.row_length);
document.getElementById("byteGroupSize").value = String(saveFile.group_size);

const container = document.querySelector(".wrapper");
const fileSelector = document.getElementById("opened_files_list");

remoteForm.addEventListener("submit",loadRemote);
download_form.addEventListener("submit",download_selected_file);
search_form.addEventListener("submit",searchInFile);
settings_form.addEventListener("submit",updateSettings);
fileInput.addEventListener("change",handleFileStream);


//(`${Date.now()/1000} | `)
/*
0 - nothing
1 - error
2 - info
3 - debug (but how??)
*/
let log_level = 2

function my_implem_of_logging(fn){
    return function (...args){
        let error;
        try{
            if (log_level>=2){
                console.log(`${Date.now()/1000} | called ${fn.name} with {${args}}`);
            }
            
            console.log(`${Date.now()/1000} | called ${fn.name} with {${args}}`);
            const fn_result = fn(args);

            if (log_level>=2){
                if (fn_result){    
                    console.log(`${Date.now()/1000} | ${fn.name} returned "${fn_result}"`);
                } else {
                    console.log(`${Date.now()/1000} | ${fn.name} returned with nothing`);
                }
            }
            
            return fn_result; 
        } catch(internal_error){
            if (log_level>=1){
                console.log(`${Date.now()/1000} | withLogs caught an error: ${internal_error}`);
                alert(`Caught an error: \n${internal_error}`);
            }
        }
    }
}

class Queue {
    constructor(){
        this.first = null;
        this.last = null;
        this.length = 0;
    }

    //insert from the top
    push(item){
        if (this.length>=128) return item;
        const last = this.last;
        const element = {prev:last, next:null, item};
        if(last) last.next = element;
        else this.first = element;
        this.last = element;
        this.length+=1;
    }

    //pick from the top
    pop(){
        const element = this.last;
        if(!element) return null;
        if (this.first === element){
            this.first = null;
            this.last = null;
        } else{
            this.last = element.prev;
            this.last.next = null;
        }
        this.length-=1;
        return element.item;
    }

    //fall from bottom
    shift(){
        const element = this.first;
        if (!element) return null;
        if (this.last === element){
            this.first = null;
            this.last = null;
        } else {
            this.first = element.next;
            this.first.prev = null;
        }
        this.length-=1;
        return element.item;
    }

    //insert from bottom
    unshit(item){
        if (this.length>=128) return item;
        const first = this.first;
        const element = {prev:null, next:first, item};
        if(first) first.prev = element;
        else this.last = element;
        this.first = element;
        this.length+=1;
    }
}

function redraw_files(){
    let all_files = Array.from(document.getElementsByClassName("file_Content_Bkg_ul"));
    for (file_ul of all_files){
        let byte_cont = String(file_ul.getElementsByTagName("fileContent_byte")[0].textContent).replace(/\n/g,'');
        let text_cont = String(file_ul.getElementsByTagName("fileContent_text")[0].textContent).replace(/\n/g,'');
        //console.log(byte_cont);
        //console.log(text_cont);
        //console.log(byte_cont.length/2, text_cont.length);

        file_ul.textContent="";
        let file_contents_byte = document.createElement("fileContent_byte");
        file_contents_byte.className = "file_Content";
        file_contents_byte.contentEditable = "true";
        file_contents_byte.addEventListener("input",showCaretPos);
        let file_contents_text = document.createElement("fileContent_text");
        file_contents_text.className = "file_Content";
        file_contents_text.contentEditable = "true";

        let row_array_byte = [];
        let row_array_text = [];
        let li_array = [];
        for (let i = 0; i<byte_cont.length; i=i+2){
            //console.log(i,i+1,i/2);
            if ((i/2) % saveFile.row_length ==0){
                let ul_byte = document.createElement("ul"); //рядок байтів
                let ul_text = document.createElement("ul"); //рядок тексту
                ul_byte.className = "file_ul";
                row_array_byte.push(ul_byte);
                row_array_text.push(ul_text);
            };
            if ((i/2) % saveFile.group_size ==0){
                let li = document.createElement("li"); //елемент рядка
                li.className = "file_li";
                row_array_byte[row_array_byte.length-1].appendChild(li);
                li_array.push(li);
            };
            //console.log(byte,parseInt(byte,16));
            row_array_text[row_array_text.length-1].textContent+=text_cont[i/2];
            li_array[li_array.length-1].textContent+=byte_cont[i]+byte_cont[i+1];
            file_contents_byte.appendChild(row_array_byte[row_array_byte.length-1]);
            file_contents_text.appendChild(row_array_text[row_array_text.length-1]);
        };
        file_ul.appendChild(file_contents_byte);
        file_ul.appendChild(file_contents_text);
    }
}

function updateSettings(event){
    event.preventDefault();
    let rowLength = Number(document.getElementById("rowSize").value);
    let groupSize = Number(document.getElementById("byteGroupSize").value);
    //console.log({rowLength, groupSize});
    if (groupSize<1){
        groupSize=1;
        document.getElementById("byteGroupSize").value = String(1);
    };
    if (rowLength<1){
        rowLength=1;
        document.getElementById("rowSize").value = String(1);
    };
    if (rowLength<groupSize){
        rowLength=groupSize;
        document.getElementById("rowSize").value = document.getElementById("byteGroupSize").value;
    }
    //console.log({rowLength, groupSize});
    saveFile.row_length = rowLength;
    saveFile.group_size = groupSize;
    localStorage.setItem("JustHex_saveFile",JSON.stringify(saveFile));
    redraw_files();
}


function correct_length(input_string){
    if (input_string.length==1){
        return ("0"+input_string).toUpperCase();
    } else{
        return (input_string).toUpperCase();
    }
}

function filter_byte_inputs(e){
    //console.log(e.detail);
    const inp_char = e.detail["char"];
    const inp_type = e.detail["type"];
    const inp_caret = e.detail["caret"];
    const inp_elem = e.detail["element"];
    if (inp_elem==null){
        console.log("How did we get here? Filter didn't work....");
    };
    if (inp_char){
        if (allowed_chars.indexOf(inp_char)!=-1){
            //console.log("pass");
        } else {
            let byte_cont = String(inp_elem.textContent).replace(/\n/g,'');
            byte_cont = byte_cont.slice(0,inp_caret-1)+byte_cont.slice(inp_caret)
            inp_elem.textContent=byte_cont;
            redraw_files();
        }
    }
}

//  creating an EventTarget to process custom event 
//  (whic is an overcomplicated way to call a function...)
let byte_input_filter = new EventTarget();
byte_input_filter.addEventListener("inbound_input", filter_byte_inputs);

function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

function showCaretPos(event) {
    var el = document.activeElement;
    if (el.tagName!="FILECONTENT_BYTE"){
        return;
    }
    let given_key = event.data;
    let given_type = event.inputType;
    let caret_pos = getCaretCharacterOffsetWithin(el);
    //console.log(event.data || event.inputType);

    //  new custom event to carry values 
    //  (yes, I could use simple function call, but that's not the task)
    const inb_input = new CustomEvent("inbound_input",{
        detail:{"char":given_key, "type":given_type, "caret":caret_pos, "element":el}
    });
    byte_input_filter.dispatchEvent(inb_input);
}

function outputFile(buffer, place){
    place.textContent='';
    const file_contents_byte = document.createElement("fileContent_byte");
    file_contents_byte.className = "file_Content";
    file_contents_byte.contentEditable = "plaintext-only";
    file_contents_byte.addEventListener("input",showCaretPos);
    const file_contents_text = document.createElement("fileContent_text");
    file_contents_text.className = "file_Content";
    file_contents_text.contentEditable = "plaintext-only";

    const data = new DataView(buffer);
    const iterator = {
        idx:0,
        next(){
            const done = this.idx>=data.byteLength;
            if (done){
                return {done, value: null};
            }
            return{
                done,
                value: {
                    idx: this.idx, 
                    byte:correct_length(data.getUint8(this.idx++).toString(16).toUpperCase())
                }
            };
        },
        [Symbol.iterator](){
            return this;
        }
    };

    let row_array_byte = [];
    let row_array_text = [];
    let li_array = [];
    for (const {idx,byte} of iterator){
        if (idx % saveFile.row_length ==0){
            let ul_byte = document.createElement("ul"); //рядок байтів
            let ul_text = document.createElement("ul"); //рядок тексту
            ul_byte.className = "file_ul";
            row_array_byte.push(ul_byte);
            row_array_text.push(ul_text);
        };
        if (idx % saveFile.group_size ==0){
            let li = document.createElement("li"); //елемент рядка
            li.className = "file_li";
            row_array_byte[row_array_byte.length-1].appendChild(li);
            li_array.push(li);
        };
        //console.log(byte,parseInt(byte,16));
        let converted_text = "";
        if (byte!="0A"){
            converted_text = String.fromCharCode(parseInt(byte,16));
        } else {
            converted_text = ".";
        }
        row_array_text[row_array_text.length-1].textContent+=converted_text;
        li_array[li_array.length-1].textContent+=byte;
        file_contents_byte.appendChild(row_array_byte[row_array_byte.length-1]);
        file_contents_text.appendChild(row_array_text[row_array_text.length-1]);
    };

    place.appendChild(file_contents_byte);
    place.appendChild(file_contents_text);
}

function* file_id_generator(){
    let index = 0;
    while (true){
        yield "file"+(index++);
    }
}
const id_gen = file_id_generator();

function window_toggle(file_ID){
    document.getElementById(file_ID).classList.toggle("show");
}

function convert_list_into_queue(item_list){
    const out_queue = new Queue();
    for (item of item_list){
        //console.log(`item: ${item}`);
        out_queue.push(item);
    };
    //console.log(out_queue);
    return out_queue;
}

function add_file_to_search_list(file_id,filename){
    const search_fieldsets = document.querySelectorAll("[id='selectFileFieldset']");
    //console.log(search_fieldsets);
    search_fieldsets.forEach(search_fieldset =>{
        //console.log(search_fieldset);
        let rad_input = document.createElement("input");
        rad_input.type = "radio";
        rad_input.id = file_id+"_rad";
        rad_input.value = file_id;
        rad_input.name = "files";
        rad_input.className = "open_button";
        let rad_label = document.createElement("label");
        rad_label.for = rad_input.id;
        rad_label.textContent = filename;
        let li_item = document.createElement("li");
        li_item.className = "submenu_deco";
        li_item.appendChild(rad_input);
        li_item.appendChild(rad_label);
        search_fieldset.appendChild(li_item);
    });
}

function handleFile(event){
    const file_List = event.target.files;
    //console.log(file_List);
    const file_queue = convert_list_into_queue(file_List);
    //console.log(file_queue.first);
    let input_que_length = file_queue.length;

    for (let i=0; i<input_que_length; i++){
        const a_file = file_queue.shift();
        let filename = a_file.name;
        let cur_file_id = id_gen.next().value;
        file_ids[cur_file_id] = filename;

        let file_div = document.createElement("div");
        file_div.className = "dropdown";                //used to position insides

        let cur_file_btn = document.createElement("button");
        cur_file_btn.textContent = filename;
        cur_file_btn.className = "Headerbtn file_list_button";
        cur_file_btn.id = cur_file_id+"_btn";
        cur_file_btn.setAttribute("onclick",`window_toggle('${cur_file_id}')`);

        let cur_file_div = document.createElement("div");
        cur_file_div.className = "file_Content_Bkg main_area";    //thing that will get hidden
        cur_file_div.id = cur_file_id;

        let cur_file_ul = document.createElement("ul");
        cur_file_ul.className = "file_Content_Bkg_ul";
        cur_file_div.appendChild(cur_file_ul);

        file_div.appendChild(cur_file_btn);
        container.appendChild(cur_file_div);

        fileSelector.appendChild(file_div); 
        add_file_to_search_list(cur_file_id,filename);

        is_file_present = true; 
        const reader = new FileReader();
        reader.onload = () => {
            outputFile(reader.result, cur_file_ul);
        };
        reader.onerror = () => {
            console.log("Error reading the file. Please try again.");
        };
        reader.readAsArrayBuffer(a_file);
    }
}

//FINISHED!!!!
async function handleFileStream(event){
    const file_List = event.target.files;
    //console.log(file_List);
    const file_queue = convert_list_into_queue(file_List);
    //console.log(file_queue.first);
    let input_que_length = file_queue.length;

    for (let i=0; i<input_que_length; i++){
        const a_file = file_queue.shift();
        let filename = a_file.name;
        let cur_file_id = id_gen.next().value;
        file_ids[cur_file_id] = filename;

        let file_div = document.createElement("div");
        file_div.className = "dropdown";                //used to position insides

        let cur_file_btn = document.createElement("button");
        cur_file_btn.textContent = filename;
        cur_file_btn.className = "Headerbtn file_list_button";
        cur_file_btn.id = cur_file_id+"_btn";
        cur_file_btn.setAttribute("onclick",`window_toggle('${cur_file_id}')`);

        let cur_file_div = document.createElement("div");
        cur_file_div.className = "file_Content_Bkg main_area";    //thing that will get hidden
        cur_file_div.id = cur_file_id;

        let cur_file_ul = document.createElement("ul");
        cur_file_ul.className = "file_Content_Bkg_ul";
        cur_file_div.appendChild(cur_file_ul);

        file_div.appendChild(cur_file_btn);
        container.appendChild(cur_file_div);

        fileSelector.appendChild(file_div); 
        my_implem_of_logging(add_file_to_search_list(cur_file_id,filename));

        const stream = a_file.stream();
        const reader = stream.getReader();
        let temp_array = [];
        while (true){
            try{
                const {value, done} = await reader.read();
                temp_array.push(value);
                if (done) break;
            } catch(error){
                console.log(`Error reading from stream: \n${error}`);
                alert(`Error reading from stream: \n${error}`);
                stream.cancel();
                return;
            }
        }
        let new_temp_array = await new Blob(temp_array).arrayBuffer();
        //new Uint8Array(new_temp_array).buffer
        outputFile(new_temp_array,cur_file_ul);
    }
}

function download_selected_file(event){
    event.preventDefault();
    const download_form_data = new FormData(download_form);
    let download_file_id = "";
    for (const entry of download_form_data){
        download_file_id = entry[1];
    }
    if (download_file_id===""){
        alert("You forgot to select file!");
        return;
    }
    const opened_file = document.getElementById(download_file_id);
    //console.log(opened_file,searched_file_id);

    const byte_cont = String(opened_file.getElementsByTagName("fileContent_byte")[0].textContent).replace(/\n/g,'');
    //console.log(byte_cont,searched_hex_string);
    
    let final_string = byte_cont.replace(generated_regex,"");
    let remainder_before_changes = final_string.length%2;
    if (remainder_before_changes!=0){
        for (let i = 0; i<remainder_before_changes;i++){
            final_string=final_string+"0";
        }
    }
    const byte_Array = new Uint8Array(
        final_string.match(/.{2}/g).map(byte => parseInt(byte,16))
    );
    //const byteData = new TextEncoder().encode(byte_Array);
    const my_blob = new Blob([byte_Array],{type: "binary/plain"});
    const url = URL.createObjectURL(my_blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = file_ids[download_file_id];
    a.click()
}

//OPFS?
//origin private file system?

//патерн: проксі, __не саме проксі__

//https://dl.myminifactory.com/object-assets/579fcf75b4ab7/images/720X720-667a372c7eb5702264afa357e59295e1e1b50441.jpg

// THE ASYNC FUNCTION!! Yes, this finally has to be good....
async function loadRemote(event) {
    event.preventDefault();
    const user_input_URL = document.getElementById("remoteForm_url_string").value;
    let temp_blob_load_remote = ""
    try{
        const resp = await fetch(user_input_URL);
        if (!resp.ok) throw new Error("Failed to load file!");
        temp_blob_load_remote = await resp.blob();
        temp_blob_load_remote = await temp_blob_load_remote.arrayBuffer();
    } catch (error){
        console.log(`Error while fetching file: ${error}`);
        alert(`Error while fetching file: ${error}`);
        return;
    }

    let fileid = id_gen.next().value
    let filename = "remote_" + fileid;
    //console.log(filename);
    let cur_file_id = fileid;
    file_ids[cur_file_id] = filename;
    //console.log(file_ids[cur_file_id]);

    let file_div = document.createElement("div");
    file_div.className = "dropdown"; //used to position insides

    let cur_file_btn = document.createElement("button");
    cur_file_btn.textContent = filename;
    cur_file_btn.className = "Headerbtn file_list_button";
    cur_file_btn.id = cur_file_id + "_btn";
    cur_file_btn.setAttribute("onclick", `window_toggle('${cur_file_id}')`);
    //console.log(cur_file_btn.onclick);

    let cur_file_div = document.createElement("div");
    cur_file_div.className = "file_Content_Bkg main_area"; //thing that will get hidden
    cur_file_div.id = cur_file_id;

    let cur_file_ul = document.createElement("ul");
    cur_file_ul.className = "file_Content_Bkg_ul";
    cur_file_div.appendChild(cur_file_ul);

    file_div.appendChild(cur_file_btn);
    container.appendChild(cur_file_div);

    fileSelector.appendChild(file_div);
    add_file_to_search_list(cur_file_id, filename);

    is_file_present = true;
    outputFile(temp_blob_load_remote, cur_file_ul)

    //img.src = doroCache.blobUrl;
    //img.alt = "fallen-doro";
    //img.onload = () => (img.classList = "loaded");
    //doroCache.imgs.push(img);

    //if (doroCache.imgs.length <= maxDoroCount) container.appendChild(img);
    //else {
    //  const button = document.querySelector("button");
    //  button.textContent = "There are too many doros!";
    //  button.style = "background-color:red";
    //}
}

function searchInFile(event) {
    event.preventDefault();
    const searched_hex_string = document.getElementById("searchForm_hex_string").value;
    const search_form_data = new FormData(search_form);
    let searched_file_id = "";
    for (const entry of search_form_data){
        searched_file_id = entry[1];
    }
    if (searched_file_id===""){
        alert("You forgot to select file!");
        return;
    }
    const opened_file = document.getElementById(searched_file_id);
    //console.log(opened_file,searched_file_id);

    const byte_cont = String(opened_file.getElementsByTagName("fileContent_byte")[0].textContent).replace(/\n/g,'');
    //console.log(byte_cont,searched_hex_string);
    let result = ""; 
    try{
        result = byte_cont.search(searched_hex_string);
    } catch (err){
        console.log(`Error happened while searching file. \nThe error: ${err}`);
    }
    console.log(result);
    if (result!=-1){
        alert(`Byte offset: ${result}`);
    } else{
        alert(`No matches in the file!`);
    };
}

function clear_my_localStorage(){
    localStorage.clear();
}

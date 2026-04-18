`use strict`

const saveFile = JSON.parse(localStorage.getItem("JustHex_saveFile")) || {
    row_length:16,
    group_size:4
};
localStorage.setItem("JustHex_saveFile",JSON.stringify(saveFile));

let file_ids = {};
let is_file_present = false;

const fileInput = document.getElementById("openButton");
const settings_form = document.getElementById("settingsForm");

const container = document.querySelector(".wrapper");
const fileSelector = document.getElementById("opened_files_list");

settings_form.addEventListener("submit",updateSettings);
fileInput.addEventListener("change",handleFile);

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

    //{prev:last, next:{prev:last, next:{prev:last, next:null, item}, item}, item}

    //ISN'T (and won't be) FINISHED
    //enqueue(item, priority, element){
    //    priority = Number(priority);
    //    while(priority>0){
    //        let element = this.first;
    //        if (element){
    //            let the_next = element.next;
    //            if (the_next){
    //                priority-=1;
    //                this.enqueue(item, priority, element);
    //            } else{
    //                let result = this.unshit(item);
    //                if (result) return new Error("Queue is full")
    //            }
    //        } else this.unshit(item);
    //    }
    //}
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



    // REDO THIS PART!!!!!!
    if (is_file_present){outputFile(byte_buffer);};
}


function correct_length(input_string){
    if (input_string.length==1){
        return ("0"+input_string).toUpperCase();
    } else{
        return (input_string).toUpperCase();
    }
}

function outputFile(buffer, place){
    const file_contents_byte = document.createElement("fileContent_byte");
    file_contents_byte.className = "file_Content";
    file_contents_byte.contentEditable = "true";
    const file_contents_text = document.createElement("fileContent_text");
    file_contents_text.className = "file_Content";
    file_contents_text.contentEditable = "true";

    const data = new DataView(buffer) || byte_buffer;
    const iterator = {
        idx:0,
        next(){
            const done = this.idx>=data.byteLength;
            if (done){
                return {done, value: null}
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
        row_array_text[row_array_text.length-1].textContent+=String.fromCharCode(parseInt(byte,16));
        li_array[li_array.length-1].textContent+=byte;
        file_contents_byte.appendChild(row_array_byte[row_array_byte.length-1]);
        file_contents_text.appendChild(row_array_text[row_array_text.length-1]);
        place.appendChild(file_contents_byte);
        place.appendChild(file_contents_text);
    }
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

function add_My_Events(){
    for (my_key in file_ids){
        if (file_ids.hasOwnProperty(my_key)){
            let my_val = file_ids[my_key];
            document.getElementById(my_val+"_btn").addEventListener("click",window_toggle(file_ids[my_key]));
        }
    }
}


function convert_list_into_queue(input_list){
    const out_queue = new Queue();
    for (item in input_list.keys()){
        console.log(input_list[item]);
        out_queue.push(item);
    }
    return out_queue;
}

function handleFile(event){
    const file_List = event.target.files;
    console.log(file_List);
    const file_queue = convert_list_into_queue(file_List);
    for (let i=0; i<file_queue.length; i++){
        const a_file = file_queue.shift();
        console.log(a_file);
        console.log(a_file.name);
        let filename = a_file.name;
        console.log(filename);
        file_ids[filename] = id_gen.next().value;
        console.log(file_ids[filename]);

        let file_div = document.createElement("div");
        file_div.className = "dropdown";                //used to position insides

        let cur_file_btn = document.createElement("button");
        cur_file_btn.textContent = filename;
        cur_file_btn.className = "Headerbtn file_list_button";
        cur_file_btn.id = file_ids[filename]+"_btn";
        cur_file_btn.setAttribute("onclick",`window_toggle('${file_ids[filename]}')`);
        //console.log(cur_file_btn.onclick);

        let cur_file_div = document.createElement("div");
        cur_file_div.className = "file_Content_Bkg main_area";    //thing that will get hidden
        cur_file_div.id = file_ids[filename];

        let cur_file_ul = document.createElement("ul");
        cur_file_ul.className = "file_Content_Bkg_ul";
        cur_file_div.appendChild(cur_file_ul);

        file_div.appendChild(cur_file_btn);
        container.appendChild(cur_file_div);

        fileSelector.appendChild(file_div); 

        is_file_present = true; 
        const reader = new FileReader();
        reader.onload = () => {
            //console.log("sent");
            //console.log(reader.result.length);
            //console.log(reader.result.byteLength);
            //console.log(reader.result);
            //console.log(byte_buffer);
            outputFile(reader.result, cur_file_ul);
        };
        reader.onerror = () => {
            console.log("Error reading the file. Please try again.");
        };
        reader.readAsArrayBuffer(a_file);
    }
    //add_My_Events();
}

function clear_my_localStorage(){
    localStorage.clear();
}

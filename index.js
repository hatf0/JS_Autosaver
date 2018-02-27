import {getFields, getField, getFieldCount, fileBase, filePath, isObject, FromUint8, ToUint8, byteLength} from "JS_Autosaver/TorkUtils";
export {BLSave, TestAutosaver, TestAutosaver2};


var Save1, vSave;
var BLSave = class BLSave
{
    BricksPerChunk = 500;
    TimePerTick = 100;
    SaveName = 'save.bls';
    FullPath = 'saves/AutosaverJS/save.bls';
    SaveFolder = 'saves/AutosaverJS/'
    __timer = new uv.timer();
    __descriptor = null;
    bl_idOnly = -1;
    isOnHalt = false;
    
    savegroupindex = 0;
    savebrickindex = 0;
    
    constructor(filePath='saves/AutosaverJS/save.bls', chunksize=500, ticksMS=1, bl_idOnly = -1, debug=true)
    {
        if(filePath.indexOf(".bls") === -1)
        {
            console.error("BLSave - Invalid file '" + filePath + "'");
            return;
        }
        
        console.log("BLSave object created with following args: ");
        console.log("  Path: " + filePath);
        console.log("  Chunk size: " + chunksize);
        console.log("  TicksMS: " + ticksMS);
        if(bl_idOnly != -1)
            console.log("  BL_ID attached to " + bl_idOnly);
        if(debug)
            console.log("  Debug enabled");
        
        this.BricksPerChunk = chunksize;
        this.TimePerTick = ticksMS;
        this.FullPath = filePath;
        this.SaveFolder = this.FullPath.substr(0, this.FullPath.lastIndexOf("/") + 1);
        this.SaveName = this.FullPath.substr(this.FullPath.lastIndexOf("/") + 1);
        this.bl_idOnly = bl_idOnly;
        this.__debug = debug;
        this.getPrintTexture = ts.func('getPrintTexture');
        this.__timer.parent = this;
        this.isLanServer = false;
        this.doOwnership = false;
        this.doEvents = false;
    }
    
    writeNextBrick()
    {
        
    }
    
    //TODO - move Start() to use tick formation
    onTick(id)
    {
        //print("running");
        let actualThis = this.parent;
        //print(actualThis.__descriptor);
        if(actualThis.isOnHalt)
            return;
        
        let BrickCount = 0, count = 0, SavedBricks = 0;
        let texture, path, data,e,underscorePos, name, tempObj, printbrick, str, brick, tempID, tempBrickGroup, params,emitter,emitterData,emitterName,light,lightData,lightName,item,itemData,itemName,audioEmitter,audioData,audioName,spawnMarker,spawnMarkerName;
        if(id >= actualThis.BrickGroupArray.length)
        {
            actualThis.onDone();
            return;
        }
        
        BrickCount = actualThis.BrickGroupArray[id];
        if(BrickCount > 0)
        {
            tempBrickGroup = ts.SimSet.getObject(actualThis.MainBrickGroup, actualThis.savegroupindex);
            
            count = ts.SimSet.getCount(tempBrickGroup);
            //count = tempBrickGroup.getCount();
            for(let bi = actualThis.savebrickindex; bi < (actualThis.savebrickindex + actualThis.BricksPerChunk); bi++)
            {
                if(bi >= count)
                {
                    actualThis.savegroupindex++;
                    
                    if(actualThis.savegroupindex >= actualThis.BrickGroupArray.length)
                    {
                        actualThis.onDone();
                        return true;
                    }
                    
                    if(actualThis.TimePerTick <= 0)
                        actualThis.onTick.apply(this, [actualThis.savegroupindex]);
                    else
                        this.start(actualThis.TimePerTick, 0, actualThis.onTick, [actualThis.savegroupindex]);

                    return;
                }
                //print('Starting to write out brick data...');
                //Brick writing starts
               // brick = ts.obj(tempBrickGroup.getObject(bi));
                brick = ts.SimSet.getObject(tempBrickGroup, bi);
                //print('Found brick...');
                if(brick.isPlanted == 0)
                    continue;

                data = ts.obj(brick.datablock);  
                let printID = brick.printID;
                let uiname = data.uiName;
                let pos = brick.position;
                let angleID = brick.angleID;
                let isBasePlate = brick.isBasePlate;
                let colorID = brick.colorID;
                let colorFxID = brick.colorFxID;
                let shapeFxID = brick.shapeFxID;
                //print('Getting datablock..');
                
                //print('Checking if it has a print..');
                if(data.hasPrint == 1)
                {
                  print('has print..');
                    //texture = ts.func('getPrintTexture')(brick.printID);
                    texture = actualThis.getPrintTexture(printID);
                    path = filePath(texture);
                    underscorePos = path.indexOf("_");
                    name = path.substr(underscorePos + 1, path.indexOf("_", 14) - 14) + "/" + fileBase(texture);
                    if(ts.getVariable('printNameTable' + name) !== "")
                        printbrick = name;
                }
                else
                    printbrick = '';

                //print('Constructing massive string..');
                str = uiname + '" ' + pos + ' ' + angleID + ' ' + isBasePlate + ' ' + colorID
                        + ' ' + printbrick + ' ' + colorFxID + ' ' + shapeFxID + ' ' + Number(1) + ' ' + Number(1) + ' ' + Number(1);
                uv.fs.write(actualThis.__descriptor, ToUint8(str + '\n'), 0);
                //print('Wrote out the massive string..');
                if(actualThis.doOwnership && actualThis.isLanServer)
                {
                    try
                    {
                        tempObj = ts.obj(ts.func('getBrickGroupFromObject'))
                    }
                    catch(e)
                    {

                    }

                    if(e === "")
                    {
                        tempID = ts.func('getBrickGroupFromObject')(brick);
                        tempID = tempID.bl_id;
                        if(tempID !== "")
                            uv.fs.write(actualThis.__descriptor, ToUint8('+-OWNER ' + tempID + '\n'), 0);
                        else
                            uv.fs.write(actualThis.__descriptor, ToUint8('+-OWNER 888888\n'), 0);
                    }
                }

                if(actualThis.doEvents)
                {
                    if(brick.getName() !== "")
                        uv.fs.write(actualThis.__descriptor, ToUint8('+-NTOBJECTNAME ' + brick.getName()), 0);

                    for(let en = 0; en < brick.numEvents; en++)
                    {
                        params = getFields(brick.serializeEventToString(en), 7, 10);
                        uv.fs.write(actualThis.__descriptor, ToUint8('+-EVENT \t' + en + '\t' + brick.eventEnabled[en] + '\t' + brick.eventInput[en] + '\t' + brick.eventDelay[en] + '\t' + brick.eventTarget[en] + '\t' + brick.eventNT[en] + '\t' + brick.eventOutput[en] + '\t' + params + '\n'), 0);
                    }
                }

                /*
                try
                {
                    emitter = ts.obj(brick.emitter);
                    emitterData = ts.obj(emitter.getEmitterDatablock())
                }
                catch(e)
                {

                }

                if(e === '' && isObject(emitter) && isObject(emitterData) && (emitterName = emitterData.uiName) !== "")
                    uv.fs.write(actualThis.__descriptor, ToUint8('+-EMITTER ' + emitterName + '" ' + brick.emitterDirection + '\n'), 0);

                try
                {
                    light = ts.obj(brick.lightID);
                    lightData = ts.obj(light.datablock);
                }
                catch(e)
                {

                }

                if(e === '' && isObject(light) && isObject(lightData) && (lightName = lightData.uiName) !== "")
                    uv.fs.write(actualThis.__descriptor, ToUint8('+-LIGHT ' + lightName + '" \n'), 0);

                try
                {
                    item = ts.obj(brick.item);
                    itemData = ts.obj(item.datablock);
                }
                catch(e)
                {

                }

                if(e === '' && isObject(item) && isObject(itemData) && (itemName = itemData.uiName) !== "")
                    uv.fs.write(actualThis.__descriptor, ToUint8('+-ITEM ' + itemName + '" ' + brick.itemPosition + ' ' + brick.itemDirection + ' ' + brick.itemRespawnTime + '\n'), 0);

                try
                {
                    audioEmitter = ts.obj(brick.audioEmitter);
                    audioData = ts.obj(audioEmitter.profileID);
                }
                catch(e)
                {

                }

                if(e === '' && isObject(audioEmitter) && isObject(audioData) && (audioName = audioData.uiName) !== "")
                    uv.fs.write(actualThis.__descriptor, ToUint8('+-AUDIOEMITTER ' + audioName + '" \n'), 0);

                try
                {
                    spawnMarker = ts.obj(brick.vehicleSpawnMarker);
                }
                catch(e)
                {

                }

                if(e === '' && isObject(spawnMarker) && (spawnMarkerName = spawnMarker.uiName) !== "")
                    uv.fs.write(actualThis.__descriptor, ToUint8('+-VEHICLE ' + spawnMarkerName + '" ' + brick.reColorVehicle + '\n'), 0);
                */
                //Brick writing ends
                SavedBricks++;
            }
            actualThis.savebrickindex += actualThis.BricksPerChunk;
        }
        else
            actualThis.savegroupindex++;
        
        if(actualThis.savegroupindex >= actualThis.BrickGroupArray.length)
        {
            actualThis.onDone();
            return true;
        }
        
        if(actualThis.TimePerTick <= 0)
            actualThis.onTick.apply(this, [actualThis.savegroupindex]);
        else
            this.start(actualThis.TimePerTick, 0, actualThis.onTick, [actualThis.savegroupindex]);
        
        return true;
    }
    
    start()
    {
        console.log("BLSave - Saver started!");
                this.startTime = uv.misc.hrtime();
        
        try
        {
            uv.fs.mkdir(this.SaveFolder);
        }
        catch (e)
        {
            if(e !== 'file already exists')
                console.error("BLSave - Error creating directory");
        }
        
        console.log("  detecting bricks");
        this.MainBrickGroup = null;
        try
        {
            this.MainBrickGroup = ts.obj('MainBrickGroup');
        }
        catch(e)
        {
            console.error("BLSave - Main brick group is missing!");
            return;
        }
        
        let MainBrickGroup_Count = ts.SimSet.getCount(this.MainBrickGroup);
        this.BrickGroupArray = new Array(this.MainBrickGroup_Count);
        this.BrickGroupArraySave = new Array(this.MainBrickGroup_Count);
        this.tempObj = null;
        this.TotalBricks = 0;
        let tempObj;
        
        if(this.__debug)
            console.log("  found " + MainBrickGroup_Count + " brickgroups -- tallying bricks");
        
        for(let i = 0; i < MainBrickGroup_Count; i++)
        {
            tempObj = ts.SimSet.getObject(this.MainBrickGroup, i);
        
            if(this.bl_idOnly != -1)
            {
                if(this.bl_idOnly == tempObj.bl_id)
                {   

                    //this.BrickGroupArray[i] = tempObj.getCount();
                    this.BrickGroupArray[i] = ts.SimSet.getCount(tempObj);
                    if(this.__debug)
                        console.log("     found " + this.BrickGroupArray[i] + " bricks in special group");
                }
                else
                    this.BrickGroupArray[i] = 0;
            }
            else if(this.bl_idOnly == -1)
              this.BrickGroupArray[i] = ts.SimSet.getCount(tempObj);
        
            if(this.BrickGroupArray[i] > 0)
            {
                if(this.__debug)
                    console.log("     array(" + i + ") - found " + this.BrickGroupArray[i] + " bricks");
                
                this.BrickGroupArraySave[i] = true; //could be useless in the future
                this.TotalBricks += this.BrickGroupArray[i];
            }
        }
        
        //w = write only
        //wa = write and append
        uv.fs.chmod(this.FullPath, 511);
        this.__descriptor = uv.fs.open(this.FullPath, 'wa');
        //uv.fs.fchmod(this.__descriptor, 777); //give it full perms everywhere...
        uv.fs.write(this.__descriptor, ToUint8('This is a Blockland autosave file.  You probably shouldn\'t modify it cause you\'ll mess it up.\n1\n'), 0);
        uv.fs.write(this.__descriptor, ToUint8('Description usually goes here, written in javascript anyway\n'), 0);
        let colorIDTable = ts.func('getColorIDTable');
        for(let i = 0; i < 64; i++)
            uv.fs.write(this.__descriptor, ToUint8(colorIDTable(i) + '\n'), 0);
        uv.fs.write(this.__descriptor, ToUint8('Linecount ' + this.TotalBricks + '\n'), 0);
        //this.__timer.start(5, 0, this.onTick, [0]);
        this.onTick.apply(this.__timer, [0]);
    }
    
    onDone()
    {
        this.isOnHalt = false;
        uv.fs.close(this.__descriptor);
        this.__descriptor = null;
        ts.func('talk')("Saver complete. Saved " + this.TotalBricks + " bricks in " + ((uv.misc.hrtime() - this.startTime) / 1000000000) + " seconds");
    }
    
    halt()
    {
        this.isOnHalt = true;
        console.log("Save is now on halt.");
    }
    
    resume()
    {
        this.isOnHalt = false;
        this.onTick(this.savegroupindex);
    }
};

function TestAutosaver()
{
    
    Save1 = undefined;
    Save1 = new BLSave();
    Save1.start();
}

function TestAutosaver2()
{
    vSave = undefined;
    vSave = new BLSave('saves/AutosaverJS/save.bls', 500, 100, 48980, true);
}

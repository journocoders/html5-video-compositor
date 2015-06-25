import Video from "./sources/video.js";
import Image from "./sources/image.js";
import Canvas from "./sources/canvas.js";


let updateables = [];
let previousTime = undefined;
let mediaSourceMapping = new Map();
mediaSourceMapping.set("video",Video).set("image",Image).set("canvas",Canvas);


function registerUpdateable(updateable){
    updateables.push(updateable);
}
function update(time){
    if (previousTime === undefined) previousTime = time;
    let dt = (time - previousTime)/1000;
    for(let i = 0; i < updateables.length; i++){
        updateables[i].update(dt);
    }
    previousTime = time;
    requestAnimationFrame(update);
}
update();


class VideoCompositor {
    constructor(canvas){
        console.log("Hello VideoCompositor");
        this._canvas = canvas;
        this._ctx = this._canvas.getContext('webgl');
        this._playing = false;
        this._mediaSources = [];

        this.playlist;
        this.currentTime = 0;
        registerUpdateable(this);
    }

    set currentTime(currentTime){
        console.log("Seeking to", currentTime);
    }
    
    set playlist(playlist){
        // Playlist 
        // 
        // var playlist = {
        //      "tracks":{
        //          "1":[{type:"video", start:0, duration:5, src:"video1.mp4", uuid:"1"},                        {type:"video", start:7.5, duration:5, src:"video2.mp4", uuid:"3"}],
        //          "2":[                        {type:"image", start:2.5, duration:5, src:"image.png", uuid:"2"}],
        //      }
        // }
        //
        //this.playlist = playlist;
        VideoCompositor.validatePlaylist(playlist);
    }

    play(){
        this._playing = true;
    }

    pause() {
        this._playing = false;
        for (let i = 0; i < this._mediaSources.length; i++) {
            this._mediaSources[i].pause();
        };
    }

    stop(){
        this.pause();
        this.currentTime = 0;
    }



    _getPlaylistStatusAtTime(playlist, playhead){
        let toPlay = [];
        let currentlyPlaying = [];
        let finishedPlaying = [];

        //itterate tracks
        for(let i = 0; i < playlist.tracks.length; i++){
            let track = playlist.tracks[i];
            for (let j = 0; j < track.length; j++) {
                let segment = track[j];
                let segmentEnd = segment.start+segment.duration;

                if (playhead > segmentEnd){
                    finishedPlaying.push(segment);
                    continue;
                }
                if (playhead > segment.start && playhead < segmentEnd){
                    currentlyPlaying.push(segment);
                    continue;
                }
                if(playhead < segment.start){
                    toPlay.push(segment);
                    continue;
                }
            };
        }

        return [toPlay, currentlyPlaying, finishedPlaying];
    }

    _calculateTrackDuration(track){
        let maxPlayheadPosition = 0;
        for (let j = 0; j < track.length; j++) {
            let playheadPosition = track[j].start + track[j].duration;
            if (playheadPosition > maxPlayheadPosition){
                maxPlayheadPosition = playheadPosition;
            }
        };
        return maxPlayheadPosition;
    }

    _calculatePlaylistDuration(playlist){
        let maxTrackDuration = 0;

        for(let i = 0; i < playlist.tracks.length; i++){
            let track = playlist.tracks[i];
            let trackDuration = this._calculateTrackDuration(track);
            if (trackDuration > maxTrackDuration){
                maxTrackDuration = trackDuration;
            }
        }

        return maxTrackDuration;
    }

    update(dt){
        if (this.playlist === undefined || this._playing === false) return;
        this.currentTime += dt;
        let [toPlay, currentlyPlaying, finishedPlaying] = this._getPlaylistStatusAtTime(this.playlist, this.currentTime);
        //console.log(toPlay, currentlyPlaying, finishedPlaying);

    }

    static validatePlaylist(playlist){
        /* 
    
        This function validates a passed playlist, making sure it matches a 
        number of properties a playlist must have to be OK.
        
        * Error 1. The playlist media sources have all the expected properties.
        * Error 2. Media sources in single track are sequential.
        * Error 3. Media sources in single track don't overlap

        */


        //Error 1. The playlist media sources have all the expected properties.
        for (let i = 0; i < playlist.tracks.length; i++) {
            let track = playlist.tracks[i]
            for (let j = 0; j < track.length; j++) {
                let mediaSource = track[j];
                if (mediaSource.id === undefined) throw {"error":2,"msg":"mediaSource "+mediaSource.id+" in track " +i+" is missing a id property", toString:function(){console.log(this.msg);}};
                if (mediaSource.start === undefined) throw {"error":2,"msg":"mediaSource "+mediaSource.id+" in track " +i+" is missing a start property", toString:function(){console.log(this.msg);}};
                if (mediaSource.duration === undefined) throw {"error":2,"msg":"mediaSource "+mediaSource.id+" in track " +i+" is missing a duration property", toString:function(){console.log(this.msg);}};
                if (mediaSource.type === undefined) throw {"error":2,"msg":"mediaSource "+mediaSource.id+" in track " +i+" is missing a type property", toString:function(){console.log(this.msg);}};
            }
        }


        // Error 2. Media sources in single track are sequential.
        for (let i = 0; i < playlist.tracks.length; i++) {
            let track = playlist.tracks[i]
            let time = 0;

            for (let j = 0; j < track.length; j++) {
                let mediaSource = track[j];
                if (mediaSource.start < time){
                    throw {"error":2,"msg":"mediaSource "+mediaSource.id+" in track " +i+" starts before previous mediaSource", toString:function(){console.log(this.msg);}};
                }
                time = mediaSource.start;
            }
        }        

        //Error 3. Media sources in single track don't overlap
        for (let i = 0; i < playlist.tracks.length; i++) {
            let track = playlist.tracks[i]
            let previousMediaSource = undefined;
            for (let j = 0; j < track.length; j++) {
                let mediaSource = track[j];
                if (previousMediaSource === undefined){
                    previousMediaSource = mediaSource;
                    continue;
                }
                let previousEnd = previousMediaSource.start + previousMediaSource.duration;
                let currentStart = mediaSource.start;
                if (previousEnd > currentStart){
                    throw {"error":2,"msg":"Track mediaSource overlap. mediaSource "+previousMediaSource.id+" in track " +i+" finishes after mediaSource " + mediaSource.id +" starts.", toString:function(){console.log(this.msg);}};
                }
            }
        }
    }
}

export default VideoCompositor;
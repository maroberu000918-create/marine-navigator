const map=L.map('map').setView([33.84,132.77],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
let marker=null,watchId=null,track=[],line=L.polyline([],{color:'#e24b35',weight:4}).addTo(map),distance=0;
const $=id=>document.getElementById(id);function hav(a,b){const R=6371e3,p=Math.PI/180,d1=(b.lat-a.lat)*p,d2=(b.lng-a.lng)*p;const x=Math.sin(d1/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(d2/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function update(){ $('points').textContent=track.length;$('distance').textContent=(distance/1000).toFixed(2)+' km';if(track.length){const p=track[track.length-1];$('coords').textContent=p.lat.toFixed(5)+', '+p.lng.toFixed(5);$('accuracy').textContent=p.accuracy?Math.round(p.accuracy)+' m':'--';}}
function onPos(pos){const p={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,time:new Date(pos.timestamp).toISOString()};$('gpsdot').classList.add('on');$('gpsstatus').textContent='GPS取得中';if(!marker){marker=L.marker([p.lat,p.lng]).addTo(map).bindPopup('自船位置');map.setView([p.lat,p.lng],13)}else marker.setLatLng([p.lat,p.lng]);if(watchId!==null){if(track.length)distance+=hav(track[track.length-1],p);track.push(p);line.addLatLng([p.lat,p.lng]);}update()}
function error(e){$('gpsstatus').textContent='GPS取得失敗：'+e.message;$('gpsdot').classList.remove('on')}
$('locate').onclick=()=>{if(!navigator.geolocation){$('gpsstatus').textContent='このブラウザは位置情報に未対応';return}navigator.geolocation.getCurrentPosition(pos=>{onPos(pos);map.setView([pos.coords.latitude,pos.coords.longitude],13)},error,{enableHighAccuracy:true,timeout:15000})};
$('start').onclick=()=>{if(!navigator.geolocation){alert('位置情報に対応したブラウザで開いてください');return}if(watchId!==null)return;track=[];distance=0;line.setLatLngs([]);watchId=navigator.geolocation.watchPosition(onPos,error,{enableHighAccuracy:true,maximumAge:1000});$('start').disabled=true;$('stop').disabled=false;$('gpsstatus').textContent='航跡記録中'};
$('stop').onclick=()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;$('start').disabled=false;$('stop').disabled=true;$('gpsstatus').textContent='記録停止';};
$('export').onclick=()=>{if(!track.length){alert('航跡がありません。先に記録を開始してください。');return}const pts=track.map(p=>`<trkpt lat="${p.lat}" lon="${p.lng}"><time>${p.time}</time></trkpt>`).join('');const xml=`<?xml version="1.0"?><gpx version="1.1" creator="MarineNavigatorJP"><trk><name>Marine Navigator Track</name><trkseg>${pts}</trkseg></trk></gpx>`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/gpx+xml'}));a.download='marine-track.gpx';a.click();URL.revokeObjectURL(a.href)};
['wind','depth','current'].forEach(id=>$(id).onchange=()=>{$('layerNotice').textContent='選択中：'+(['wind','depth','current'].filter(k=>$(k).checked).map(k=>({wind:'風向・風速',depth:'水深',current:'潮流'}[k])).join('・')||'なし')+'。データ配信元との接続は未実装のため、地図上に実データは描画されません。';});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});


// 選択地点の予測海況（Open-Meteo公開API）
let selectedMarker=null;
const deg=d=>{if(d===null||d===undefined||Number.isNaN(Number(d)))return '--';const dirs=['北','北北東','北東','東北東','東','東南東','南東','南南東','南','南南西','南西','西南西','西','西北西','北西','北北西'];return dirs[Math.round(Number(d)/22.5)%16]+' ('+Math.round(Number(d))+'°)';};
async function loadMarine(lat,lng){
 const status=$('marineStatus');status.textContent='選択地点の予測データを取得しています…';
 $('windValue').textContent='取得中…';$('currentValue').textContent='取得中…';$('waveValue').textContent='取得中…';
 try{
  const wurl=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Asia%2FTokyo`;
  const murl=`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=ocean_current_velocity,ocean_current_direction,wave_height,wave_direction&length_unit=metric&timezone=Asia%2FTokyo`;
  const [wr,mr]=await Promise.all([fetch(wurl),fetch(murl)]);
  if(!wr.ok||!mr.ok)throw new Error('データ配信元から応答がありません');
  const [wd,md]=await Promise.all([wr.json(),mr.json()]);
  const wc=wd.current||{},mc=md.current||{};
  $('windValue').textContent=(wc.wind_speed_10m!=null?`${deg(wc.wind_direction_10m)}・${Number(wc.wind_speed_10m).toFixed(1)} m/s`:'データなし');
  $('currentValue').textContent=(mc.ocean_current_velocity!=null?`${deg(mc.ocean_current_direction)}・${Number(mc.ocean_current_velocity).toFixed(2)} km/h`:'データなし');
  $('waveValue').textContent=(mc.wave_height!=null?`${Number(mc.wave_height).toFixed(2)} m・${deg(mc.wave_direction)}`:'データなし');
  status.textContent=`選択地点 ${lat.toFixed(4)}, ${lng.toFixed(4)} ／ 予測更新時刻：${wc.time||mc.time||'不明'}（日本時間）`;
 }catch(e){
  status.textContent='取得できませんでした：'+e.message+'。海上地点を選び直すか、時間をおいて再試行してください。';
  $('windValue').textContent='取得失敗';$('currentValue').textContent='取得失敗';$('waveValue').textContent='取得失敗';
 }
}
map.on('click',e=>{
 const {lat,lng}=e.latlng;
 if(selectedMarker)selectedMarker.setLatLng(e.latlng);
 else selectedMarker=L.circleMarker(e.latlng,{radius:8,color:'#ff7a00',fillColor:'#ffd166',fillOpacity:.9}).addTo(map);
 selectedMarker.bindPopup('海況データ取得地点').openPopup();
 loadMarine(lat,lng);
});
let depthLayers = [];

async function showDepth() {
  $('layerNotice').textContent = '5種類の水深データを取得中...';

  const settings = [
    { layer: 10, name: '20m', color: '#f0c94a' },
    { layer: 11, name: '50m', color: '#ff8c42' },
    { layer: 12, name: '100m', color: '#e85d75' },
    { layer: 13, name: '150m', color: '#9b72cf' },
    { layer: 14, name: '200m', color: '#45a6d6' }
  ];

  try {
    depthLayers.forEach(layer => map.removeLayer(layer));
    depthLayers = [];

    for (const setting of settings) {
      const response = await fetch(
        'https://tiny-poetry-3853.maroberu000918.workers.dev/depth?layer=' + setting.layer
      );

      if (!response.ok) {
        throw new Error(setting.name + 'の取得失敗 HTTP ' + response.status);
      }

      const data = await response.json();
      const lines = [];

      (data.features || []).forEach(feature => {
        (feature.geometry?.paths || []).forEach(path => {
          const points = path.map(([lng, lat]) => [lat, lng]);

          if (points.length > 1) {
            lines.push(
              L.polyline(points, {
                color: setting.color,
                weight: 2,
                opacity: 0.85
              })
            );
          }
        });
      });

      const group = L.layerGroup(lines).addTo(map);
      depthLayers.push(group);
    }

    $('layerNotice').textContent =
      '海しるの20m・50m・100m・150m・200m等深線を表示中です。';

  } catch (e) {
    $('layerNotice').textContent = '水深データ取得失敗：' + e.message;
  }
}

$('depth').addEventListener('change', () => {
  if ($('depth').checked) {
    showDepth();
  } else {
    depthLayers.forEach(layer => map.removeLayer(layer));
    depthLayers = [];
    $('layerNotice').textContent = '水深表示をオフにしました。';
  }
});

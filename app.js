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
// 風向・風速表示機能
let windLayer = null;
let windReloadTimer = null;

async function showWind() {
  $('layerNotice').textContent = '風向・風速データを取得中...';

  try {
    if (windLayer) map.removeLayer(windLayer);

    windLayer = L.layerGroup().addTo(map);

    const bounds = map.getBounds();
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    const locations = [];

    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        locations.push({
          lat: south + (north - south) * y / 4,
          lng: west + (east - west) * x / 4
        });
      }
    }

    let success = 0;

    await Promise.all(locations.map(async point => {
      try {
        const url =
          'https://api.open-meteo.com/v1/forecast' +
          '?latitude=' + point.lat +
          '&longitude=' + point.lng +
          '&current=wind_speed_10m,wind_direction_10m' +
          '&wind_speed_unit=ms&timezone=auto';

        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        if (!data.current) return;

        const speed = data.current.wind_speed_10m;
        const direction = data.current.wind_direction_10m;

        if (speed == null || direction == null) return;

        const arrow = L.divIcon({
          className: '',
          html:
            '<div style="font-size:30px;color:#087bd1;' +
            'text-shadow:0 1px 3px white;' +
            'transform:rotate(' + ((direction + 180) % 360) + 'deg);">' +
            '↑</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker([point.lat, point.lng], {
          icon: arrow
        }).bindTooltip(
          '風速 ' + speed.toFixed(1) +
          ' m/s ・ 風向 ' + Math.round(direction) + '°'
        ).addTo(windLayer);

        success++;
      } catch (e) {
        // 個別地点の取得失敗はスキップ
      }
    }));

    $('layerNotice').textContent =
      '風向・風速を表示中（' + success +
      '地点）。気象モデルによる予報データです。提供：Open-Meteo';

  } catch (e) {
    $('layerNotice').textContent =
      '風データ取得失敗：' + e.message;
  }
}

$('wind').addEventListener('change', () => {
  if ($('wind').checked) {
    showWind();
  } else {
    if (windLayer) map.removeLayer(windLayer);
    windLayer = null;
    $('layerNotice').textContent = '風向・風速表示をオフにしました。';
  }
});

map.on('moveend', () => {
  if ($('wind').checked) {
    clearTimeout(windReloadTimer);
    windReloadTimer = setTimeout(showWind, 700);
  }
});

// Windyをマリンナビ内に表示する機能
const windyButton = document.createElement('button');
windyButton.textContent = 'Windy 天気図';
windyButton.style.cssText =
  'position:fixed;right:12px;top:12px;z-index:9000;' +
  'padding:12px 16px;background:#087bd1;color:white;' +
  'border:0;border-radius:8px;font-size:15px;font-weight:bold;' +
  'box-shadow:0 2px 6px #555;';

document.body.appendChild(windyButton);

const windyPanel = document.createElement('div');
windyPanel.style.cssText =
  'display:none;position:fixed;inset:0;z-index:10000;' +
  'background:white;';

const windyHeader = document.createElement('div');
windyHeader.style.cssText =
  'height:48px;background:#087bd1;color:white;' +
  'display:flex;align-items:center;justify-content:space-between;' +
  'padding:0 12px;font-weight:bold;';

const windyTitle = document.createElement('span');
windyTitle.textContent = 'Windy 気象情報';

const windyClose = document.createElement('button');
windyClose.textContent = '閉じる ×';
windyClose.style.cssText =
  'padding:8px 14px;border:0;border-radius:6px;' +
  'background:white;color:#087bd1;font-weight:bold;';

windyHeader.appendChild(windyTitle);
windyHeader.appendChild(windyClose);

const windyFrame = document.createElement('iframe');
windyFrame.title = 'Windy天気図';
windyFrame.src =
  'https://embed.windy.com/embed2.html?' +
  'lat=33.84&lon=132.77&zoom=7&level=surface' +
  '&overlay=wind&menu=&message=&marker=' +
  '&calendar=now&pressure=&type=map&location=coordinates' +
  '&detail=&detailLat=33.84&detailLon=132.77' +
  '&metricWind=default&metricTemp=default&radarRange=-1';

windyFrame.style.cssText =
  'width:100%;height:calc(100% - 48px);border:0;';

windyPanel.appendChild(windyHeader);
windyPanel.appendChild(windyFrame);
document.body.appendChild(windyPanel);

windyButton.onclick = () => {
  windyPanel.style.display = 'block';
};

windyClose.onclick = () => {
  windyPanel.style.display = 'none';
};

const windyLayerSelect = document.createElement('select');

windyLayerSelect.style.cssText =
  'padding:7px;border:0;border-radius:6px;' +
  'font-size:14px;margin:0 8px;';

const windyOptions = [
  { value: 'wind', label: '風向・風速' },
  { value: 'waves', label: '波高・波向' },
  { value: 'rain', label: '雨・雷' },
  { value: 'temp', label: '気温' },
  { value: 'pressure', label: '気圧' }
];

windyOptions.forEach(item => {
  const option = document.createElement('option');
  option.value = item.value;
  option.textContent = item.label;
  windyLayerSelect.appendChild(option);
});

windyHeader.insertBefore(windyLayerSelect, windyClose);

windyLayerSelect.onchange = () => {
  const overlay = windyLayerSelect.value;

  windyFrame.src =
    'https://embed.windy.com/embed2.html?' +
    'lat=33.84&lon=132.77&zoom=7&level=surface' +
    '&overlay=' + encodeURIComponent(overlay) +
    '&menu=&message=&marker=&calendar=now' +
    '&pressure=&type=map&location=coordinates' +
    '&detail=&detailLat=33.84&detailLon=132.77' +
    '&metricWind=default&metricTemp=default&radarRange=-1';
};
// 海域選択機能
const marineAreas = [
  { name: '瀬戸内海', lat: 34.0, lng: 133.3, zoom: 8 },
  { name: '紀伊水道', lat: 33.8, lng: 134.9, zoom: 8 },
  { name: '豊後水道', lat: 33.2, lng: 132.0, zoom: 8 },
  { name: '和歌山沖', lat: 33.5, lng: 135.5, zoom: 7 },
  { name: '高知沖', lat: 32.8, lng: 133.5, zoom: 7 }
];

const areaPanel = document.createElement('div');

areaPanel.style.cssText =
  'position:fixed;bottom:12px;left:12px;z-index:8999;' +
  'display:flex;flex-wrap:wrap;gap:5px;max-width:95%;' +
  'padding:7px;background:white;border-radius:9px;' +
  'box-shadow:0 2px 8px #555;';

marineAreas.forEach(area => {
  const button = document.createElement('button');
  button.textContent = area.name;

  button.style.cssText =
    'padding:9px 11px;border:0;border-radius:6px;' +
    'background:#087bd1;color:white;font-size:13px;' +
    'font-weight:bold;';

  button.onclick = () => {
    map.setView([area.lat, area.lng], area.zoom);

    if (windyFrame) {
      const overlay = windyLayerSelect.value;

      windyFrame.src =
        'https://embed.windy.com/embed2.html?' +
        'lat=' + area.lat +
        '&lon=' + area.lng +
        '&zoom=' + area.zoom +
        '&level=surface&overlay=' + encodeURIComponent(overlay) +
        '&menu=&message=&marker=&calendar=now' +
        '&pressure=&type=map&location=coordinates' +
        '&detail=&detailLat=' + area.lat +
        '&detailLon=' + area.lng +
        '&metricWind=default&metricTemp=default&radarRange=-1';
    }
  };

  areaPanel.appendChild(button);
});

document.body.appendChild(areaPanel);
// 宇和島の公式潮汐情報ボタン
const tideButton = document.createElement('button');

tideButton.textContent = '潮汐・宇和島';

tideButton.style.cssText =
  'position:fixed;right:12px;top:62px;z-index:9000;' +
  'padding:12px 16px;background:#087b65;color:white;' +
  'border:0;border-radius:8px;font-size:14px;font-weight:bold;' +
  'box-shadow:0 2px 6px #555;';

tideButton.onclick = () => {
  window.open(
    'https://www1.kaiho.mlit.go.jp/TIDE/gauge/gauge.php?s=0134',
    '_blank'
  );
};

document.body.appendChild(tideButton);
// 月齢・月の満ち欠け表示
const moonPanel = document.createElement('div');

moonPanel.style.cssText =
  'position:fixed;right:12px;top:112px;z-index:9000;' +
  'background:#102b46;color:white;padding:12px 15px;' +
  'border-radius:10px;font-size:14px;line-height:1.8;' +
  'box-shadow:0 2px 8px #555;min-width:190px;';

function updateMoonInfo() {
  const now = new Date();
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const cycle = 29.530588853;
  const days = (now.getTime() - knownNewMoon.getTime()) / 86400000;
  const age = ((days % cycle) + cycle) % cycle;
  const illumination =
    (1 - Math.cos(2 * Math.PI * age / cycle)) / 2 * 100;

  let phase = '満ちていく月';
  if (age < 1.85 || age >= 27.68) phase = '新月ごろ';
  else if (age < 5.54) phase = '三日月ごろ';
  else if (age < 9.23) phase = '上弦ごろ';
  else if (age < 12.92) phase = '十三夜ごろ';
  else if (age < 16.62) phase = '満月ごろ';
  else if (age < 20.31) phase = '欠けていく月';
  else if (age < 23.99) phase = '下弦ごろ';
  else phase = '有明月ごろ';

  const nextFull = (14.765294 - age + cycle) % cycle;
  const nextNew = (cycle - age) % cycle;

  function dateAfter(value) {
    const d = new Date(now.getTime() + value * 86400000);
    return d.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric'
    });
  }

  moonPanel.innerHTML =
    '<b>🌙 月齢情報</b><br>' +
    '月齢：約 ' + age.toFixed(1) + ' 日<br>' +
    '月の状態：' + phase + '<br>' +
    '月の明るさ：約 ' + illumination.toFixed(0) + '%<br>' +
    '次の満月：約 ' + dateAfter(nextFull) + '<br>' +
    '次の新月：約 ' + dateAfter(nextNew);
}

updateMoonInfo();
document.body.appendChild(moonPanel);

import styles from './styles/home.module.css';
import { headers } from 'next/headers';

export default async function Home() {
  const headersList = await headers();
  // 获取host（域名+端口）
  const host = headersList.get('host') || '';
  // 判断http/https
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;


  
  return (
    <div className={styles.container}>
      <h1>📺 全国IPTV直播流代理</h1>
      <p>基于Next.js + Edge Runtime的全国各地电视台直播代理服务 | EdgeOne Pages部署版本</p>
      
      <div className={styles.grid}>
        
        <div className={styles.card}>
          <h2>📡 CCTV (10个)</h2>
          <ul className={styles.smallList}>
            <li>CCTV1 - 综合频道</li>
            <li>CCTV2 - 财经频道</li>
            <li>CCTV4 - 中文国际</li>
            <li>CCTV7 - 国防军事</li>
            <li>CCTV9 - 纪录频道</li>
            <li>CCTV10 - 科教频道</li>
            <li>CCTV12 - 社会与法</li>
            <li>CCTV13 - 新闻频道</li>
            <li>CCTV17 - 农业农村</li>
            <li>CCTV4K - 4K超高清</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>🎬 4K超高清 (9个)</h2>
          <ul className={styles.smallList}>
            <li>北京卫视4K</li>
            <li>上海卫视4K</li>
            <li>江苏卫视4K</li>
            <li>浙江卫视4K</li>
            <li>山东卫视4K</li>
            <li>湖南卫视4K</li>
            <li>广东卫视4K</li>
            <li>四川卫视4K</li>
            <li>深圳卫视4K</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 北京TV (10个)</h2>
          <ul className={styles.smallList}>
            <li>北京卫视</li>
            <li>BRTV文艺</li>
            <li>BRTV纪实科教</li>
            <li>BRTV影视</li>
            <li>BRTV财经</li>
            <li>BRTV生活</li>
            <li>BRTV新闻</li>
            <li>卡酷少儿</li>
            <li>北京卫视4K</li>
            <li>BRTV体育休闲</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 河南TV (17个)</h2>
          <ul className={styles.smallList}>
            <li>河南卫视</li>
            <li>河南都市</li>
            <li>河南民生</li>
            <li>河南法治</li>
            <li>河南电视剧</li>
            <li>河南新闻</li>
            <li>欢腾购物</li>
            <li>河南公共</li>
            <li>河南乡村</li>
            <li>河南国际</li>
            <li>河南梨园</li>
            <li>文物宝库</li>
            <li>武术世界</li>
            <li>睛彩中原</li>
            <li>移动戏曲</li>
            <li>象视界</li>
            <li>国学频道</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 河北TV (8个)</h2>
          <ul className={styles.smallList}>
            <li>河北卫视</li>
            <li>经济生活</li>
            <li>三农频道</li>
            <li>河北都市</li>
            <li>河北影视剧</li>
            <li>少儿科教</li>
            <li>文旅·公共</li>
            <li>三佳购物</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 黑龙江TV (7个)</h2>
          <ul className={styles.smallList}>
            <li>黑龙江卫视</li>
            <li>黑龙江都市</li>
            <li>黑龙江影视</li>
            <li>黑龙江文体</li>
            <li>黑龙江农业科教</li>
            <li>黑龙江新闻法治</li>
            <li>黑龙江少儿</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 辽宁TV (41个) 🔗全链路代理</h2>
            <ul className={styles.smallList}>
              <li>辽宁卫视</li>
              <li>辽宁都市</li>
              <li>辽宁影视</li>
              <li>辽宁教育青少</li>
              <li>辽宁生活</li>
              <li>辽宁体育</li>
              <li>辽宁北方</li>
              <li>辽宁宜佳购物</li>
              <li>辽宁新动漫</li>
              <li>辽宁家庭理财</li>
              <li>辽宁移动电视</li>
              <li>抚顺综合/教育、清原综合</li>
              <li>调兵山、昌图、西丰、开原</li>
              <li>法库新闻综合、新民综合</li>
              <li>朝阳县、北票新闻综合、喀左综合</li>
              <li>阜蒙汉语综合、彰武</li>
              <li>兴城综合、绥中综合</li>
              <li>瓦房店新闻、庄河综合</li>
              <li>东港新东港、宽甸综合</li>
              <li>辽阳新闻、辽阳社会生活</li>
              <li>营口新闻、营口辽河文化</li>
            </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 江苏TV (50个)</h2>
          <ul className={styles.smallList}>
            <li>江苏卫视</li>
            <li>江苏城市</li>
            <li>江苏综艺</li>
            <li>江苏影视</li>
            <li>江苏新闻</li>
            <li>江苏教育</li>
            <li>江苏体育休闲</li>
            <li>江苏国际</li>
            <li>优漫卡通</li>
            <li>南京新闻综合</li>
            <li>六合新闻综合</li>
            <li>无锡新闻综合</li>
            <li>江阴新闻综合</li>
            <li>徐州新闻综合</li>
            <li>邳州综合</li>
            <li>新沂新闻综合</li>
            <li>贾汪新闻综合</li>
            <li>铜山新闻综合</li>
            <li>常州新闻</li>
            <li>武进综合</li>
            <li>苏州新闻综合</li>
            <li>常熟综合</li>
            <li>吴江新闻综合</li>
            <li>张家港新闻综合</li>
            <li>南通新闻综合</li>
            <li>连云港新闻综合</li>
            <li>东海新闻综合</li>
            <li>淮安综合</li>
            <li>盱眙综合</li>
            <li>洪泽综合</li>
            <li>盐城1套</li>
            <li>响水综合</li>
            <li>扬州新闻</li>
            <li>邗江综合</li>
            <li>镇江新闻综合</li>
            <li>句容新闻综合</li>
            <li>泰州新闻</li>
            <li>靖江新闻</li>
            <li>泰兴新闻综合</li>
            <li>兴化新闻综合</li>
            <li>宿迁综合</li>
            <li>泗阳综合</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 山东TV (26个)</h2>
          <ul className={styles.smallList}>
            <li>山东卫视4K</li>
            <li>新闻频道</li>
            <li>齐鲁频道</li>
            <li>体育休闲频道</li>
            <li>生活频道</li>
            <li>综艺频道</li>
            <li>文旅频道</li>
            <li>农科频道</li>
            <li>少儿频道</li>
            <li>济南台</li>
            <li>淄博台</li>
            <li>枣庄台</li>
            <li>东营台</li>
            <li>烟台台</li>
            <li>潍坊台</li>
            <li>泰安台</li>
            <li>威海台</li>
            <li>日照台</li>
            <li>临沂台</li>
            <li>德州台</li>
            <li>聊城台</li>
            <li>滨州台</li>
            <li>菏泽台</li>
            <li>济宁台</li>
            <li>莱芜台</li>
            <li>章丘台</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 陕西TV (17个)</h2>
          <ul className={styles.smallList}>
            <li>农林卫视</li>
            <li>新闻资讯</li>
            <li>都市青春</li>
            <li>银龄频道</li>
            <li>秦腔频道</li>
            <li>陕西卫视</li>
            <li>体育休闲</li>
            <li>乐家购物</li>
            <li>移动电视</li>
            <li>新闻广播</li>
            <li>汽车调频</li>
            <li>交通广播</li>
            <li>音乐广播</li>
            <li>都市广播</li>
            <li>青少广播</li>
            <li>戏曲广播</li>
            <li>农村广播</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 深圳TV (11个)</h2>
          <ul className={styles.smallList}>
            <li>深圳卫视4K</li>
            <li>深圳卫视</li>
            <li>都市频道</li>
            <li>电视剧频道</li>
            <li>公共频道</li>
            <li>财经频道</li>
            <li>娱乐生活</li>
            <li>少儿频道</li>
            <li>移动电视</li>
            <li>宜和购物频道</li>
            <li>国际频道</li>
          </ul>
        </div>
 
        <div className={styles.card}>
          <h2>📺 浙江TV (58个)</h2>
          <p><strong>浙江省台 🎬 (9个):</strong> 浙江卫视、钱江频道、浙江经视、教科影视频道、新闻频道、民生休闲频道、少儿频道、之江纪录、国际频道</p>
          <p><strong>地市台 🎬 (11个):</strong> 杭州综合、宁波一套、温州综合、湖州综合、嘉兴综合、绍兴综合、金华综合、衢州综合、舟山综合、台州综合、丽水综合</p>
          <p><strong>地区台 (38个):</strong></p>
          <ul className={styles.smallList}>
            <li>杭州萧山综合</li>
            <li>象山新闻综合</li>
            <li>温州苍南新闻综合</li>
            <li>温州永嘉新闻综合</li>
            <li>温州电视台</li>
            <li>瑞安新闻综合</li>
            <li>柯桥新闻综合</li>
            <li>金华东阳影视生活</li>
            <li>金华磐安新闻综合</li>
            <li>金华磐安文化旅游</li>
            <li>金华永康新闻综合</li>
            <li>金华永康华溪频道</li>
            <li>嵊州新闻综合</li>
            <li>台州天台和合频道</li>
            <li>台州玉环新闻综合</li>
            <li>嘉兴新闻综合</li>
            <li>嘉兴文化旅游</li>
            <li>嘉兴公共</li>
            <li>丽水龙泉新闻综合</li>
            <li>丽水松阳新闻综合</li>
            <li>丽水云和新闻综合</li>
            <li>丽水庆元电视台</li>
            <li>平湖综合</li>
            <li>衢州常山新闻综合</li>
            <li>衢州开化综合</li>
            <li>东阳新闻综合</li>
            <li>东阳影视生活</li>
            <li>武义新闻综合</li>
            <li>景宁电视台</li>
            <li>青田电视台</li>
            <li>舟山普陀新闻综合</li>
            <li>遂昌电视台</li>
            <li>舟山新闻综合</li>
            <li>舟山公共</li>
            <li>宁波余姚姚江文化</li>
            <li>江山电视台</li>
            <li>龙游新闻综合</li>
            <li>衢江新闻综合</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 杭州TV (7个) 🔗</h2>
          <ul className={styles.smallList}>
            <li>杭州综合</li>
            <li>西湖明珠</li>
            <li>杭州生活</li>
            <li>杭州影视</li>
            <li>青少体育</li>
            <li>杭州导视</li>
            <li>富阳新闻综合</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 上海TV (8个)</h2>
          <ul className={styles.smallList}>
            <li>东方卫视4k</li>
            <li>上海新闻综合</li>
            <li>上海都市</li>
            <li>第一财经</li>
            <li>哈哈炫动</li>
            <li>五星体育</li>
            <li>上海魔都眼</li>
            <li>上海新纪实</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 广州TV (4个)</h2>
          <ul className={styles.smallList}>
            <li>广州综合</li>
            <li>广州新闻</li>
            <li>南国都市（4K）</li>
            <li>广州法治</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 南京TV (5个)</h2>
          <ul className={styles.smallList}>
            <li>新闻综合频道</li>
            <li>教育科技频道</li>
            <li>十八·生活频道</li>
            <li>文旅纪录频道</li>
            <li>少儿频道</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 广西TV (11个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>广西卫视</li>
            <li>综艺旅游频道</li>
            <li>都市频道</li>
            <li>影视频道</li>
            <li>新闻频道</li>
            <li>国际频道</li>
            <li>乐思购频道</li>
            <li>移动数字电视频道</li>
            <li>CETV-1</li>
            <li>CETV-2</li>
            <li>CETV-4</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 广东TV (20个)</h2>
          <ul className={styles.smallList}>
            <li>广东卫视</li>
            <li>广东珠江</li>
            <li>广东新闻</li>
            <li>大湾区卫视</li>
            <li>广东体育</li>
            <li>广东民生</li>
            <li>大湾区卫视</li>
            <li>广东影视</li>
            <li>广东4K</li>
            <li>广东少儿</li>
            <li>嘉佳卡通</li>
            <li>南方购物</li>
            <li>岭南戏曲</li>
            <li>广东移动</li>
            <li>现代教育</li>
            <li>广东台经典剧</li>
            <li>广东纪录片</li>
            <li>GRTN健康频道</li>
            <li>GRTN文化频道</li>
            <li>GRTN生活频道</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 四川TV (10个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>四川卫视4K</li>
            <li>四川卫视</li>
            <li>四川经济</li>
            <li>四川文化旅游</li>
            <li>四川新闻</li>
            <li>四川影视文艺</li>
            <li>四川星空购物</li>
            <li>四川妇女儿童</li>
            <li>四川乡村</li>
            <li>康巴卫视</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 山西TV (17个)</h2>
          <ul className={styles.smallList}>
            <li>山西卫视</li>
            <li>山西经济</li>
            <li>山西影视</li>
            <li>山西社会与法治</li>
            <li>山西文体生活</li>
            <li>山西黄河</li>
            <li>太原新闻综合</li>
            <li>大同新闻综合</li>
            <li>阳泉新闻综合</li>
            <li>长治新闻综合</li>
            <li>晋城新闻综合</li>
            <li>朔州新闻综合</li>
            <li>晋中综合</li>
            <li>运城新闻综合</li>
            <li>忻州综合</li>
            <li>临汾新闻综合</li>
            <li>吕梁新闻综合</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 吉林TV (动态，目前15个)</h2>
          <ul className={styles.smallList}>
            <li>吉林卫视</li>
            <li>都市频道</li>
            <li>生活频道</li>
            <li>影视频道</li>
            <li>乡村频道</li>
            <li>综艺文化</li>
            <li>长春新闻综合</li>
            <li>吉视公共新闻</li>
            <li>四平新闻综合</li>
            <li>辽源新闻综合</li>
            <li>通化新闻综合</li>
            <li>白山新闻综合</li>
            <li>白城新闻综合</li>
            <li>松原新闻综合</li>
            <li>延边卫视</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 甘肃TV (6个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>甘肃卫视</li>
            <li>文化影视</li>
            <li>公共应急</li>
            <li>少儿频道</li>
            <li>科教频道</li>
            <li>移动电视</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 兰州TV (5个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>兰州新闻综合</li>
            <li>兰州文旅</li>
            <li>新闻综合广播</li>
            <li>音乐广播</li>
            <li>文艺广播</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 湖北TV (13个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>湖北卫视</li>
            <li>湖北经视</li>
            <li>湖北综合</li>
            <li>湖北影视</li>
            <li>湖北生活</li>
            <li>湖北教育</li>
            <li>垄上频道</li>
            <li>湖北之声</li>
            <li>经典音乐</li>
            <li>城市之声</li>
            <li>楚天交通</li>
            <li>楚天音乐</li>
            <li>农村广播</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 湖北地方TV (动态，目前32个) 🔗部分代理</h2>
          <p className={styles.highlight}>✅ 精选可播放频道</p>
          <details>
            <summary><strong>长江云地市台 (13个)</strong></summary>
            <ul className={styles.tinyList}>
              <li>宜昌综合、宜昌旅游生活</li>
              <li>大冶综合、大冶湖之声FM89.3📻</li>
              <li>当阳电视台</li>
              <li>应城综合频道、应城综合广播📻</li>
              <li>孝感新闻综合、孝感生活</li>
              <li>咸宁综合、咸宁经济生活</li>
              <li>襄阳综合广播📻</li>
            </ul>
          </details>
          <details>
            <summary><strong>恩施广电 (9个)</strong></summary>
            <ul className={styles.tinyList}>
              <li>📺 恩施综合、恩施文旅</li>
              <li>📺 巴东综合、咸丰综合、鹤峰综合</li>
              <li>📻 咸丰FM103.5、鹤峰FM102.1</li>
              <li>📻 恩施FM99、恩施FM94</li>
            </ul>
          </details>
          <details>
            <summary><strong>其他地区 (10个)</strong></summary>
            <ul className={styles.tinyList}>
              <li>十堰新闻综合、十堰经济旅游</li>
              <li>荆门新闻综合、荆门科教文旅</li>
              <li>长阳综合</li>
              <li>🔗 江陵综合、襄阳综合</li>
              <li>🔗 襄阳经济生活、襄阳公共</li>
              <li>🔗 武穴综合、罗田综合</li>
            </ul>
          </details>
          <p className={styles.note}>
            📻 7个广播频道 | 🔗 6个代理频道（自动Referer）<br/>
            <code>/api/hubei?id=list</code> - 精选频道<br/>
            <code>/api/hubei?id=list&all=1</code> - 全部动态
          </p>
        </div>

        <div className={styles.card}>
          <h2>📺 内蒙古TV (动态，目前20个)</h2>
          <ul className={styles.smallList}>
              <li>内蒙古卫视、内蒙古蒙古语卫视</li>
              <li>内蒙古新闻综合、内蒙古经济生活</li>
              <li>内蒙古少儿、内蒙古文体娱乐</li>
              <li>内蒙古农牧、内蒙古蒙古语文化</li>
              <li>呼和浩特、锡林郭勒</li>
              <li>阿拉善、巴彦淖尔</li>
              <li>鄂尔多斯、赤峰</li>
              <li>通辽、乌兰察布</li>
              <li>乌海、呼伦贝尔</li>
              <li>兴安、包头</li>
            </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 石家庄TV (动态)</h2>
          <ul className={styles.smallList}>
            <li>频道列表实时同步API</li>
            <li>请访问 id=list 获取最新频道</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 重庆TV (1个)</h2>
          <ul className={styles.smallList}>
            <li>重庆新闻</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 湖南TV (16个)</h2>
            <ul className={styles.smallList}>
              <li>湖南经视、湖南电影</li>
              <li>湖南都市、湖南电视剧</li>
              <li>湖南爱晚、湖南国际</li>
              <li>湖南娱乐</li>
              <li>金鹰纪实、金鹰卡通</li>
              <li>快乐垂钓、先锋乒羽</li>
              <li>长沙新闻、长沙政法、长沙女性</li>
              <li>快乐购、茶频道</li>
            </ul>
         </div>
       
        <div className={styles.card}>
          <h2>📺 海南TV (7个)</h2>
          <ul className={styles.smallList}>
            <li>海南卫视、三沙卫视</li>
            <li>海南新闻、海南文旅</li>
            <li>海南自贸、海南公共</li>
            <li>海南少儿</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 贵州TV (7个)</h2>
          <ul className={styles.smallList}>
            <li>贵州卫视、贵州公共</li>
            <li>贵州文艺、贵州生活</li>
            <li>贵州生态乡村、贵州科教健康</li>
            <li>贵州移动电视</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 江西TV (20个)</h2>
          <ul className={styles.smallList}>
            <li>江西卫视</li>
            <li>江西都市</li>
            <li>江西经济生活</li>
            <li>江西影视旅游</li>
            <li>江西公共农业</li>
            <li>江西少儿</li>
            <li>江西新闻</li>
            <li>江西陶瓷</li>
            <li>风尚购物</li>
            <li>抚州综合</li>
            <li>赣州新闻综合</li>
            <li>吉安综合</li>
            <li>景德镇新闻综合</li>
            <li>九江新闻综合</li>
            <li>南昌新闻综合</li>
            <li>萍乡新闻综合</li>
            <li>上饶新闻综合</li>
            <li>新余新闻综合</li>
            <li>宜春综合</li>
            <li>鹰潭综合</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 青海TV (4个)</h2>
          <ul className={styles.smallList}>
            <li>青海卫视</li>
            <li>青海经视</li>
            <li>青海都市</li>
            <li>安多卫视</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 宁夏TV (5个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>宁夏卫视</li>
            <li>宁夏公共</li>
            <li>宁夏经济</li>
            <li>宁夏文旅</li>
            <li>宁夏少儿</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 西藏TV (3个)</h2>
          <ul className={styles.smallList}>
            <li>西藏卫视</li>
            <li>西藏藏语</li>
            <li>西藏影视</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 新疆TV (动态，目前7个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>新疆卫视</li>
            <li>维吾尔语新闻综合</li>
            <li>哈萨克语新闻综合</li>
            <li>汉语综艺、维吾尔语影视</li>
            <li>汉语体育健康、少儿频道</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 云南TV (6个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>云南卫视</li>
            <li>云南都市</li>
            <li>云南娱乐</li>
            <li>云南公共</li>
            <li>云南国际</li>
            <li>云南少儿</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 安徽TV (动态，目前8个) 🔗全链路代理</h2>
          <ul className={styles.smallList}>
            <li>安徽卫视</li>
            <li>经济生活</li>
            <li>综艺体育</li>
            <li>影视频道</li>
            <li>公共频道</li>
            <li>农业科教</li>
            <li>国际频道</li>
            <li>移动电视</li>
            <li>...（频道列表实时同步API）</li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2>📺 福建TV (10个)</h2>
          <ul className={styles.smallList}>
            <li>综合频道</li>
            <li>东南卫视</li>
            <li>乡村振兴·公共频道</li>
            <li>新闻频道</li>
            <li>电视剧频道</li>
            <li>旅游频道</li>
            <li>经济生活频道</li>
            <li>文体频道</li>
            <li>少儿频道</li>
            <li>海峡卫视</li>
          </ul>
        </div>

      </div>

      <div className={styles.note}>
        <h2>📖 使用说明</h2>
        <ol>
          <li><strong>直接播放</strong>: 复制API链接到VLC/PotPlayer等播放器</li>
          <li><strong>频道列表</strong>: 添加 <code>?id=list</code> 参数获取M3U8格式频道列表</li>
          <li><strong>多种ID格式</strong>: 吉林台支持友好ID(jlws)、数字ID(2)、ch前缀(ch2)</li>
          <li><strong>清晰度选择</strong>: CCTV频道支持 <code>&q=lg</code>(蓝光)/<code>cq</code>(超清)/<code>gq</code>(高清)</li>
          <li><strong>生成播放列表</strong>:
            <pre className={styles.pre}>
{`# 获取CCTV频道列表
curl ${baseUrl}/api/cctv?id=list > cctv.m3u8

# 获取4K频道列表
curl https://your-domain.com/api/4k?id=list > 4k.m3u8

# 获取吉林台列表（动态）
curl https://your-domain.com/api/jilin?id=list > jilin.m3u8

# 播放CCTV1蓝光
vlc "https://your-domain.com/api/cctv?id=cctv1&q=lg"`}
            </pre>
          </li>
        </ol>
      </div>
      <div className={styles.warningBox}>
        <p><strong>⚠️ 注意事项</strong></p>
        <ul>
          <li>仅供学习交流使用,请遵守相关法律法规</li>
          <li>部分频道可能因版权限制无法播放</li>
          <li>建议在EdgeOne Pages免费额度内使用</li>
        </ul>
      </div>
      <footer className={styles.footer}>
        <p>Powered by Next.js 14 + Edge Runtime | Deployed on EdgeOne Pages</p>
        <p><a href="https://github.com/vitter/iptv-edgeone" target="_blank" rel="noopener noreferrer">GitHub 仓库</a> | <a href="https://raw.githubusercontent.com/vitter/iptv-edgeone/refs/heads/main/README.md" target="_blank" rel="noopener noreferrer">查看文档</a></p>
      </footer>
    </div>
  );
}

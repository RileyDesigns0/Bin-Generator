from pathlib import Path
import base64
p=Path(__file__).resolve().parent
html=(p/'ui.html').read_text()
def safe(s): return s.replace('</script', '<\\/script')
libs='\n'.join('<script>'+safe((p/'vendor'/n).read_text())+'</script>' for n in ['three.min.js','OrbitControls.js'])
core=(p/'core.js').read_text()+'\n'+(p/'refine.js').read_text()
html=html.replace('<!-- BUNDLED_LIBRARIES -->',libs+'\n<script>'+safe(core)+'</script>')
html=html.replace('/* CORE_SOURCE */',safe(core)).replace('/* STEP_SOURCE */',safe((p/'vendor/occt.js').read_text()))
html=html.replace('WASM_BASE64',base64.b64encode((p/'vendor/occt.wasm').read_bytes()).decode())
import html as escape_html
notices='<details style="padding:20px"><summary>Third-party licenses & source</summary><p>Three.js r128 (MIT): https://github.com/mrdoob/three.js/tree/r128<br>occt-import-js 0.0.23 (LGPL-2.1): https://github.com/kovacsv/occt-import-js<br>OpenCascade: https://dev.opencascade.org/resources/licensing</p>'
for name in ['THREE-LICENSE.txt','OCCT-IMPORT-LICENSE.txt','OCCT-LICENSE.txt','OCCT-EXCEPTION.txt']:
 notices+='<h3>'+name+'</h3><pre style="white-space:pre-wrap">'+escape_html.escape((p/'vendor'/name).read_text())+'</pre>'
notices+='</details>'
html=html.replace('</aside>',notices+'</aside>')
out=p/'Formnest.html'
out.write_text(html)
print(f'Built {out} ({out.stat().st_size:,} bytes), all dependencies embedded.')

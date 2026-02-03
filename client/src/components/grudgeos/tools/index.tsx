import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FolderArchive, FileCode, Image, HardDrive, Play, Upload, Download,
  Folder, File, RefreshCw, Trash2, Plus, Search, Database
} from 'lucide-react';
import { WorkflowTool } from './WorkflowTool';

export function CompilerTool() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Select file to compile..." className="flex-1 bg-[#1a1a25] border-[#2a2a3a]" />
        <Button size="sm" className="bg-[#8b5cf6] hover:bg-[#7c4dff]">
          <Upload className="w-4 h-4 mr-2" />
          Browse
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="border-[#2a2a3a]">TypeScript</Button>
        <Button size="sm" variant="outline" className="border-[#2a2a3a]">JavaScript</Button>
        <Button size="sm" variant="outline" className="border-[#2a2a3a]">WASM</Button>
      </div>
      <div className="flex-1 bg-[#0a0a0f] rounded-lg p-3 font-mono text-xs text-[#8b8b9b]">
        <div className="text-[#00ff88]">Ready to compile...</div>
        <div className="mt-2">Select a source file and target format.</div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 bg-[#00ff88] hover:bg-[#00dd77] text-black">
          <Play className="w-4 h-4 mr-2" />
          Compile
        </Button>
        <Button variant="outline" className="border-[#2a2a3a]">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function ArchiveTool() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Drop archive file here..." className="flex-1 bg-[#1a1a25] border-[#2a2a3a]" />
        <Button size="sm" className="bg-[#8b5cf6] hover:bg-[#7c4dff]">
          <Upload className="w-4 h-4 mr-2" />
          Open
        </Button>
      </div>
      <div className="flex gap-2">
        <Badge variant="outline" className="border-[#f59e0b] text-[#f59e0b]">.zip</Badge>
        <Badge variant="outline" className="border-[#3b82f6] text-[#3b82f6]">.tar.gz</Badge>
        <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6]">.7z</Badge>
        <Badge variant="outline" className="border-[#00ff88] text-[#00ff88]">.rar</Badge>
      </div>
      <ScrollArea className="flex-1 bg-[#0a0a0f] rounded-lg">
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
            <Folder className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm text-[#e8e8ff]">src/</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer pl-6">
            <File className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-sm text-[#e8e8ff]">index.ts</span>
            <span className="text-xs text-[#8b8b9b] ml-auto">2.4 KB</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
            <File className="w-4 h-4 text-[#8b8b9b]" />
            <span className="text-sm text-[#e8e8ff]">package.json</span>
            <span className="text-xs text-[#8b8b9b] ml-auto">1.1 KB</span>
          </div>
        </div>
      </ScrollArea>
      <div className="flex gap-2">
        <Button className="flex-1 bg-[#00ff88] hover:bg-[#00dd77] text-black">
          <Download className="w-4 h-4 mr-2" />
          Extract All
        </Button>
        <Button variant="outline" className="border-[#2a2a3a]">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function ConverterTool() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[#8b8b9b] mb-1 block">Input Format</label>
          <div className="flex gap-1 flex-wrap">
            <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] cursor-pointer">.obj</Badge>
            <Badge variant="outline" className="border-[#2a2a3a] cursor-pointer">.fbx</Badge>
            <Badge variant="outline" className="border-[#2a2a3a] cursor-pointer">.png</Badge>
            <Badge variant="outline" className="border-[#2a2a3a] cursor-pointer">.jpg</Badge>
          </div>
        </div>
        <div>
          <label className="text-xs text-[#8b8b9b] mb-1 block">Output Format</label>
          <div className="flex gap-1 flex-wrap">
            <Badge className="bg-[#00ff88]/20 text-[#00ff88] cursor-pointer">.glb</Badge>
            <Badge variant="outline" className="border-[#2a2a3a] cursor-pointer">.gltf</Badge>
            <Badge variant="outline" className="border-[#2a2a3a] cursor-pointer">.webp</Badge>
            <Badge variant="outline" className="border-[#2a2a3a] cursor-pointer">.avif</Badge>
          </div>
        </div>
      </div>
      <div className="flex-1 border-2 border-dashed border-[#2a2a3a] rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#8b5cf6]/50 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 text-[#8b8b9b]" />
        <span className="text-sm text-[#8b8b9b]">Drop files here or click to browse</span>
        <span className="text-xs text-[#8b8b9b]">Supports 3D models and images</span>
      </div>
      <Button className="bg-[#8b5cf6] hover:bg-[#7c4dff]">
        <RefreshCw className="w-4 h-4 mr-2" />
        Convert Files
      </Button>
    </div>
  );
}

export function StorageBrowser() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a3a]">
        <Button size="sm" variant="ghost" className="text-[#8b8b9b]">
          <HardDrive className="w-4 h-4 mr-2" />
          Puter Storage
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-[#1a1a25] rounded px-2">
          <Search className="w-3 h-3 text-[#8b8b9b]" />
          <Input placeholder="Search..." className="border-0 bg-transparent h-7 w-32 text-sm" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {['Documents', 'Projects', 'Assets', 'Backups'].map(folder => (
            <div key={folder} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5 cursor-pointer">
              <Folder className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-sm text-[#e8e8ff]">{folder}</span>
              <span className="text-xs text-[#8b8b9b] ml-auto">Folder</span>
            </div>
          ))}
          {['config.json', 'README.md', 'app.tsx'].map(file => (
            <div key={file} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5 cursor-pointer">
              <FileCode className="w-5 h-5 text-[#3b82f6]" />
              <span className="text-sm text-[#e8e8ff]">{file}</span>
              <span className="text-xs text-[#8b8b9b] ml-auto">2.1 KB</span>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2 p-3 border-t border-[#2a2a3a] bg-[#0f0f18]">
        <Button size="sm" variant="outline" className="border-[#2a2a3a]">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
        <Button size="sm" variant="outline" className="border-[#2a2a3a]">
          <Upload className="w-4 h-4 mr-1" />
          Upload
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="text-red-400">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function QdrantTool() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a3a]">
        <Button size="sm" variant="ghost" className="text-[#8b8b9b]">
          <Database className="w-4 h-4 mr-2" />
          Qdrant Vector DB
        </Button>
        <Badge className="bg-[#00ff88]/20 text-[#00ff88] text-[10px]">Connected</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="border-[#2a2a3a] text-xs">
          Web UI
        </Button>
      </div>
      <div className="p-3 border-b border-[#2a2a3a]">
        <label className="text-xs text-[#8b8b9b] mb-1 block">Collection</label>
        <div className="flex gap-2">
          <Input placeholder="embeddings" className="flex-1 bg-[#1a1a25] border-[#2a2a3a] h-8" />
          <Button size="sm" className="bg-[#8b5cf6] hover:bg-[#7c4dff]">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {['project-embeddings', 'code-vectors', 'docs-search', 'ai-memory'].map((collection, i) => (
            <div key={collection} className="flex items-center gap-2 px-3 py-2 rounded bg-[#1a1a25] hover:bg-[#2a2a3a] cursor-pointer">
              <Database className="w-4 h-4 text-[#e94560]" />
              <div className="flex-1">
                <div className="text-sm text-[#e8e8ff]">{collection}</div>
                <div className="text-[10px] text-[#8b8b9b]">{(i + 1) * 1247} vectors | 384 dimensions</div>
              </div>
              <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6] text-[10px]">active</Badge>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-[#2a2a3a]">
        <div className="flex gap-2">
          <Input placeholder="Search vectors..." className="flex-1 bg-[#1a1a25] border-[#2a2a3a] h-8" />
          <Button size="sm" className="bg-[#e94560] hover:bg-[#d13350]">
            <Search className="w-3 h-3 mr-1" />
            Query
          </Button>
        </div>
      </div>
    </div>
  );
}

export { WorkflowTool };
export { WasmRunner } from './WasmRunner';
export { ShellTerminal } from './ShellTerminal';

export const TOOL_REGISTRY: Record<string, React.ComponentType> = {
  compiler: CompilerTool,
  archive: ArchiveTool,
  converter: ConverterTool,
  storage: StorageBrowser,
  qdrant: QdrantTool,
  workflows: WorkflowTool,
};

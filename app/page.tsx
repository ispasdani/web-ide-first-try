"use client";

import { useEffect, useState } from 'react';
import { FileIcon, FolderIcon, Terminal, MonitorIcon, XIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

export default function Home() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isFileSystemApiSupported = () => {
    return 'showDirectoryPicker' in window;
  };

  const handleFolderSelect = async () => {
    setError(null);
    
    if (!isFileSystemApiSupported()) {
      setError('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.');
      return;
    }

    try {
      // Check if we're in a cross-origin iframe
      if (window.top !== window.self) {
        throw new Error('This feature cannot be used within an iframe. Please open the application in a new tab.');
      }

      // @ts-ignore - FileSystemDirectoryHandle is not in TypeScript's lib
      const dirHandle = await window.showDirectoryPicker();
      const filesData = await readDirectory(dirHandle);
      setFiles(filesData);
    } catch (error: any) {
      console.error('Error selecting folder:', error);
      if (error.name === 'SecurityError') {
        setError('Cannot access files due to security restrictions. Please try opening the application in a new tab.');
      } else {
        setError(error.message || 'Failed to open folder. Please try again.');
      }
    }
  };

  const readDirectory = async (dirHandle: any, path = ''): Promise<FileNode[]> => {
    const entries = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const content = await file.text();
        entries.push({
          name: entry.name,
          type: 'file',
          content
        });
      } else if (entry.kind === 'directory') {
        entries.push({
          name: entry.name,
          type: 'directory',
          children: await readDirectory(entry, `${path}/${entry.name}`)
        });
      }
    }
    return entries;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node, index) => (
      <div key={index} style={{ marginLeft: `${level * 16}px` }}>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            if (node.type === 'file') {
              setSelectedFile({ name: node.name, content: node.content || '' });
            }
          }}
        >
          {node.type === 'directory' ? (
            <FolderIcon className="mr-2 h-4 w-4" />
          ) : (
            <FileIcon className="mr-2 h-4 w-4" />
          )}
          {node.name}
        </Button>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-12 border-b flex items-center px-4 bg-card">
        <h1 className="text-lg font-semibold">Web IDE</h1>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full flex flex-col border-r">
            <div className="p-4 border-b flex flex-col gap-4">
              <Button onClick={handleFolderSelect} className="w-full">
                Open Folder
              </Button>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <ScrollArea className="flex-1">
              {renderFileTree(files)}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Content */}
        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70}>
              <Tabs defaultValue="editor" className="h-full flex flex-col">
                <TabsList className="px-4 border-b">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="flex-1 p-0">
                  {selectedFile ? (
                    <div className="h-full">
                      <div className="border-b px-4 py-2 flex items-center justify-between">
                        <span>{selectedFile.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedFile(null)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-[calc(100%-41px)]">
                        <pre className="p-4 text-sm">
                          <code>{selectedFile.content}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Select a file to view its contents
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="preview" className="flex-1 p-0">
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Preview will be shown here when a development server is running
                  </div>
                </TabsContent>
              </Tabs>
            </ResizablePanel>

            <ResizableHandle />

            {/* Terminal */}
            <ResizablePanel defaultSize={30}>
              <div className="h-full flex flex-col border-t">
                <div className="px-4 py-2 border-b flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  <span className="font-medium">Terminal</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 font-mono text-sm">
                    {terminalOutput.length > 0 ? (
                      terminalOutput.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">
                        Terminal output will appear here
                      </span>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
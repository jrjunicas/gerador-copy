import React, { useState } from 'react';
import { GeneratedContent, NetworkContent, ContentRequest } from '../types';
import { ClipboardIcon, CheckIcon, SparklesIcon, LightBulbIcon } from './Icons';

interface GeneratedContentDisplayProps {
  batchContent: (GeneratedContent | { error: string })[] | null;
  originalRequests: ContentRequest[];
  isLoading: boolean;
  error: string | null;
}

const useCopyToClipboard = (text: string) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return { copied, copy };
};

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

const ContentBlock: React.FC<{ title: string; children: React.ReactNode; textToCopy: string, icon?: React.ReactNode }> = ({ title, children, textToCopy, icon }) => {
  const { copied, copy } = useCopyToClipboard(textToCopy);

  return (
    <div className="bg-brand-light-gray rounded-lg p-5 mb-6 relative transition-all hover:shadow-2xl hover:border-brand-purple border border-transparent">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <button
          onClick={copy}
          className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors text-brand-text-light"
          aria-label={`Copiar ${title}`}
        >
          {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
        </button>
      </div>
      <div className="text-brand-text space-y-2 prose prose-invert max-w-none">
        {children}
      </div>
    </div>
  );
};

const SingleContentResult: React.FC<{content: GeneratedContent}> = ({ content }) => {
  return (
    <div className="space-y-6">
       <ContentBlock title="Sugestão Criativa" textToCopy={content.creativeSuggestion} icon={<LightBulbIcon className="w-6 h-6 text-yellow-400"/>}>
        <MarkdownRenderer text={content.creativeSuggestion} />
      </ContentBlock>

      <ContentBlock title="Frases para Capa" textToCopy={content.coverPhrases.join('\n')} icon={<SparklesIcon className="w-6 h-6 text-pink-400"/>}>
        <ul className="list-disc pl-5 space-y-1">
          {content.coverPhrases.map((phrase, index) => (
            <li key={index}>{phrase}</li>
          ))}
        </ul>
      </ContentBlock>

      {Object.entries(content.networkContent).map(([network, data]) => {
        const typedData = data as NetworkContent;
        return (
        <ContentBlock 
            key={network} 
            title={network} 
            textToCopy={`Legenda:\n${typedData.caption}\n\nHashtags:\n${typedData.hashtags}`}
            icon={<div className="w-6 h-6 bg-brand-light-purple rounded-md flex items-center justify-center text-white font-bold text-xs">{network.substring(0,2).toUpperCase()}</div>}
            >
          <div>
            <h4 className="font-semibold text-white mb-1">Legenda</h4>
            <p className="whitespace-pre-wrap">{typedData.caption}</p>
          </div>
          <div className="pt-2">
            <h4 className="font-semibold text-white mb-1">Hashtags</h4>
            <p className="text-brand-light-purple">{typedData.hashtags}</p>
          </div>
        </ContentBlock>
      );
      })}
    </div>
  )
}


const GeneratedContentDisplay: React.FC<GeneratedContentDisplayProps> = ({ batchContent, originalRequests, isLoading, error }) => {

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-gray rounded-lg p-8 min-h-[500px]">
         <SparklesIcon className="w-16 h-16 text-brand-purple animate-pulse" />
         <h2 className="text-2xl font-bold mt-4 text-white">Analisando o universo...</h2>
         <p className="text-brand-text-light mt-2">Nossa IA está criando o conteúdo perfeito para você.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-8 text-center min-h-[500px]">
        <h2 className="text-2xl font-bold text-red-400">Oops! Algo deu errado.</h2>
        <p className="text-red-300 mt-2">{error}</p>
      </div>
    );
  }

  if (!batchContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-brand-gray rounded-lg p-8 text-center min-h-[500px] border-2 border-dashed border-brand-light-gray">
        <SparklesIcon className="w-16 h-16 text-brand-light-gray" />
        <h2 className="text-2xl font-bold mt-4 text-white">Seus conteúdos aparecerão aqui</h2>
        <p className="text-brand-text-light mt-2 max-w-md">Preencha as informações ao lado, adicione conteúdos à fila e clique em "Gerar Conteúdos" para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white border-b border-brand-light-gray pb-3 mb-6">Resultados Gerados</h2>
      {batchContent.map((result, index) => {
        const request = originalRequests[index];
        return (
          <div key={request.id} className="bg-brand-gray p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-brand-purple mb-4">
              Conteúdo para: <span className="text-white">"{request.theme}"</span>
            </h3>
            {'error' in result ? (
              <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4 text-center">
                <p className="font-bold text-red-400">Falha ao gerar este conteúdo.</p>
                <p className="text-red-300 mt-1 text-sm">{result.error}</p>
              </div>
            ) : (
              <SingleContentResult content={result as GeneratedContent} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GeneratedContentDisplay;